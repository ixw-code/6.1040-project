import { createHash, randomBytes } from 'node:crypto';
import type { Db } from 'mongodb';

export class SessionInvalid extends Error {}

type SessionRecord = { user: string; expiresAt: Date; verifierHash: string };
const lifetimeMs = 7 * 24 * 60 * 60 * 1000;

function verifierHash(session: string): string {
  return createHash('sha256').update(session).digest('hex');
}

/** Owns revocable, fixed-lifetime sessions; only verifier hashes reach MongoDB. */
export class SessioningConcept {
  private readonly sessions;
  private indexes: Promise<unknown> | undefined;

  constructor(db: Db, private readonly clock: () => Date = () => new Date()) {
    this.sessions = db.collection<SessionRecord>('sessioning.sessions');
  }

  #ready(): Promise<unknown> {
    this.indexes ??= this.sessions.createIndex(
      { verifierHash: 1 }, { unique: true, name: 'verifier_hash_unique' },
    ).catch((error: unknown) => {
      this.indexes = undefined;
      throw error;
    });
    return this.indexes;
  }

  async start({ user }: { user: string }): Promise<{ session: string; expiresAt: Date }> {
    await this.#ready();
    const session = randomBytes(32).toString('base64url');
    const expiresAt = new Date(this.clock().getTime() + lifetimeMs);
    await this.sessions.insertOne({ user, expiresAt, verifierHash: verifierHash(session) });
    return { session, expiresAt };
  }

  async use({ session }: { session: string }): Promise<{ user: string }> {
    const found = await this.sessions.findOne({
      verifierHash: verifierHash(session), expiresAt: { $gt: this.clock() },
    });
    if (!found) throw new SessionInvalid();
    return { user: found.user };
  }

  async end({ session }: { session: string }): Promise<{ ended: boolean }> {
    const result = await this.sessions.deleteOne({ verifierHash: verifierHash(session) });
    return { ended: result.deletedCount === 1 };
  }

  async endUser({ user }: { user: string }): Promise<Record<string, never>> {
    await this.sessions.deleteMany({ user });
    return {};
  }

  async _active({ session }: { session: string }): Promise<{ user: string; expiresAt: Date }[]> {
    const found = await this.sessions.findOne({
      verifierHash: verifierHash(session), expiresAt: { $gt: this.clock() },
    });
    return found ? [{ user: found.user, expiresAt: found.expiresAt }] : [];
  }
}
