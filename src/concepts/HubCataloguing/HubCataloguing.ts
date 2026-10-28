import { MongoServerError, type ClientSession, type Db } from 'mongodb';

export class HubNameRequired extends Error {}
export class HubNameTaken extends Error {}
export class HubNotFound extends Error {}
export class HubRenameNameRequired extends Error {}
export class HubRenameNameTaken extends Error {}
export class InvalidHubSlug extends Error {}
export class HubSlugTaken extends Error {}

type Hub = { _id: string; name: string; slug: string; creator: string };

const validSlug = (slug: string) => slug.length >= 3 && slug.length <= 80 &&
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
const derivedSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function duplicateKey(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
}

/** Unique hub scopes catalogued. */
export class HubCataloguingConcept {
  private readonly hubs;

  constructor(db: Db, private readonly session?: ClientSession) {
    this.hubs = db.collection<Hub>('hubs');
  }

  async create({ name, creator }: { name: string; creator: string }): Promise<{ hub: string }> {
    const trimmed = name.trim();
    if (!trimmed) throw new HubNameRequired();
    if (await this.hubs.findOne({ name: trimmed }, { session: this.session })) throw new HubNameTaken();
    const slug = derivedSlug(trimmed);
    if (!validSlug(slug)) throw new InvalidHubSlug();
    if (await this.hubs.findOne({ slug }, { session: this.session })) throw new HubSlugTaken();

    const hub = crypto.randomUUID();
    try {
      await this.hubs.insertOne({ _id: hub, name: trimmed, slug, creator }, { session: this.session });
    } catch (error) {
      if (duplicateKey(error)) {
        if (await this.hubs.findOne({ name: trimmed }, { session: this.session })) throw new HubNameTaken();
        throw new HubSlugTaken();
      }
      throw error;
    }
    return { hub };
  }

  async rename({ hub, name }: { hub: string; name: string }): Promise<{ hub: string }> {
    // Preserve the contract's missing-hub priority over invalid replacement names.
    if (!(await this.hubs.findOne({ _id: hub }, { projection: { _id: 1 }, session: this.session }))) {
      throw new HubNotFound();
    }
    const trimmed = name.trim();
    if (!trimmed) throw new HubRenameNameRequired();
    try {
      const result = await this.hubs.updateOne({ _id: hub }, { $set: { name: trimmed } }, { session: this.session });
      if (!result.matchedCount) throw new HubNotFound();
    } catch (error) {
      if (duplicateKey(error)) throw new HubRenameNameTaken();
      throw error;
    }
    return { hub };
  }

  async updateSlug({ hub, slug }: { hub: string; slug: string }): Promise<{ slug: string }> {
    if (!(await this.hubs.findOne({ _id: hub }, { session: this.session }))) throw new HubNotFound();
    if (!validSlug(slug)) throw new InvalidHubSlug();
    if (await this.hubs.findOne({ slug, _id: { $ne: hub } }, { session: this.session })) throw new HubSlugTaken();
    try {
      const result = await this.hubs.updateOne({ _id: hub }, { $set: { slug } }, { session: this.session });
      if (!result.matchedCount) throw new HubNotFound();
    } catch (error) {
      if (duplicateKey(error)) throw new HubSlugTaken();
      throw error;
    }
    return { slug };
  }

  async delete({ hub }: { hub: string }): Promise<{ hub: string }> {
    const result = await this.hubs.deleteOne({ _id: hub }, { session: this.session });
    if (!result.deletedCount) throw new HubNotFound();
    return { hub };
  }

  async _hub({ name }: { name: string }): Promise<{ hub: string }[]> {
    const found = await this.hubs.findOne({ name }, { session: this.session });
    return found ? [{ hub: found._id }] : [];
  }

  async _hubs(_input: Record<string, never> = {}): Promise<{ hub: string; name: string }[]> {
    const rows = await this.hubs.find({}, { projection: { _id: 1, name: 1 }, session: this.session })
      .sort({ _id: 1 }).toArray();
    return rows.map(({ _id, name }) => ({ hub: _id, name }));
  }

  async _bySlug({ slug }: { slug: string }): Promise<{ hub: string }[]> {
    const found = await this.hubs.findOne({ slug }, { session: this.session });
    return found ? [{ hub: found._id }] : [];
  }

  async _get({ hub }: { hub: string }): Promise<{ name: string; slug: string; creator: string }[]> {
    const found = await this.hubs.findOne({ _id: hub }, { session: this.session });
    return found ? [{ name: found.name, slug: found.slug, creator: found.creator }] : [];
  }

  async _createdBy({ creator }: { creator: string }): Promise<{ hub: string }[]> {
    const rows = await this.hubs.find({ creator }, { session: this.session }).sort({ _id: 1 }).toArray();
    return rows.map(({ _id }) => ({ hub: _id }));
  }
}
