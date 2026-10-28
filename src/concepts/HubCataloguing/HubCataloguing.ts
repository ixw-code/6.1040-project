import { MongoServerError, type Db } from 'mongodb';

export class HubNameRequired extends Error {}
export class HubNameTaken extends Error {}
export class HubNotFound extends Error {}
export class HubRenameNameRequired extends Error {}
export class HubRenameNameTaken extends Error {}

type Hub = { _id: string; name: string };

function duplicateKey(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
}

/** Unique hub scopes catalogued. */
export class HubCataloguingConcept {
  private readonly hubs;

  constructor(db: Db) {
    this.hubs = db.collection<Hub>('hubs');
  }

  async create({ name }: { name: string }): Promise<{ hub: string }> {
    const trimmed = name.trim();
    if (!trimmed) throw new HubNameRequired();

    const hub = crypto.randomUUID();
    try {
      await this.hubs.insertOne({ _id: hub, name: trimmed });
    } catch (error) {
      if (duplicateKey(error)) throw new HubNameTaken();
      throw error;
    }
    return { hub };
  }

  async rename({ hub, name }: { hub: string; name: string }): Promise<{ hub: string }> {
    // Preserve the contract's missing-hub priority over invalid replacement names.
    if (!(await this.hubs.findOne({ _id: hub }, { projection: { _id: 1 } }))) {
      throw new HubNotFound();
    }
    const trimmed = name.trim();
    if (!trimmed) throw new HubRenameNameRequired();
    try {
      const result = await this.hubs.updateOne({ _id: hub }, { $set: { name: trimmed } });
      if (!result.matchedCount) throw new HubNotFound();
    } catch (error) {
      if (duplicateKey(error)) throw new HubRenameNameTaken();
      throw error;
    }
    return { hub };
  }

  async _hub({ name }: { name: string }): Promise<{ hub: string }[]> {
    const found = await this.hubs.findOne({ name });
    return found ? [{ hub: found._id }] : [];
  }

  async _hubs(_input: Record<string, never> = {}): Promise<{ hub: string; name: string }[]> {
    const rows = await this.hubs.find({}, { projection: { _id: 1, name: 1 } })
      .sort({ _id: 1 }).toArray();
    return rows.map(({ _id, name }) => ({ hub: _id, name }));
  }
}
