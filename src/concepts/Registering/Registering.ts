import { MongoServerError, type Db } from 'mongodb';

export class InvalidUsername extends Error {}
export class UsernameTaken extends Error {}
export class ProviderIdentityTaken extends Error {}
export class UserNotFound extends Error {}

export type Provider = 'GOOGLE' | 'COMMONS';

type UserRecord = {
  _id: string;
  username: string;
  provider: Provider;
  providerSubject: string;
};

const validUsername = /^[A-Za-z0-9]{3,20}$/;

/** Owns registered names and verified provider associations. */
export class RegisteringConcept {
  private readonly users;
  private indexes: Promise<unknown> | undefined;

  constructor(db: Db) {
    this.users = db.collection<UserRecord>('registering.users');
  }

  #ready(): Promise<unknown> {
    this.indexes ??= Promise.all([
      this.users.createIndex({ username: 1 }, { unique: true, name: 'username_unique' }),
      this.users.createIndex(
        { provider: 1, providerSubject: 1 },
        { unique: true, name: 'provider_subject_unique' },
      ),
    ]).catch((error: unknown) => {
      this.indexes = undefined;
      throw error;
    });
    return this.indexes;
  }

  async register({ username, provider, providerSubject }: {
    username: string; provider: Provider; providerSubject: string;
  }): Promise<{ user: string }> {
    if (!validUsername.test(username)) throw new InvalidUsername();
    await this.#ready();
    if (await this.users.findOne({ username }, { projection: { _id: 1 } })) {
      throw new UsernameTaken();
    }
    if (await this.users.findOne({ provider, providerSubject }, { projection: { _id: 1 } })) {
      throw new ProviderIdentityTaken();
    }
    const user = crypto.randomUUID();
    try {
      await this.users.insertOne({ _id: user, username, provider, providerSubject });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        if (error.keyPattern?.username) throw new UsernameTaken();
        if (error.keyPattern?.provider && error.keyPattern?.providerSubject) {
          throw new ProviderIdentityTaken();
        }
      }
      throw error;
    }
    return { user };
  }

  async update({ user, username }: { user: string; username: string }): Promise<{ user: string }> {
    if (!(await this.users.findOne({ _id: user }, { projection: { _id: 1 } }))) {
      throw new UserNotFound();
    }
    if (!validUsername.test(username)) throw new InvalidUsername();
    await this.#ready();
    try {
      const result = await this.users.updateOne({ _id: user }, { $set: { username } });
      if (!result.matchedCount) throw new UserNotFound();
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000 && error.keyPattern?.username) {
        throw new UsernameTaken();
      }
      throw error;
    }
    return { user };
  }

  async unregister({ user }: { user: string }): Promise<{ user: string }> {
    const result = await this.users.deleteOne({ _id: user });
    if (!result.deletedCount) throw new UserNotFound();
    return { user };
  }

  async _user({ user }: { user: string }): Promise<{
    username: string; provider: Provider; providerSubject: string;
  }[]> {
    const found = await this.users.findOne({ _id: user });
    return found ? [{
      username: found.username,
      provider: found.provider,
      providerSubject: found.providerSubject,
    }] : [];
  }

  async _byProvider({ provider, providerSubject }: {
    provider: Provider; providerSubject: string;
  }): Promise<{ user: string }[]> {
    const found = await this.users.findOne({ provider, providerSubject });
    return found ? [{ user: found._id }] : [];
  }
}
