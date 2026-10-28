import type { ClientSession, Db } from 'mongodb';

export class RequirementRuleNotFound extends Error {}

type Rule = { _id: string; required: string[] };

/** Required token sets for opaque items. */
export class RequirementTaggingConcept {
  private readonly rules;

  constructor(db: Db, private readonly session?: ClientSession) {
    this.rules = db.collection<Rule>('requirements');
  }

  async tag({ item, required }: { item: string; required: string[] }): Promise<Record<string, never>> {
    const sorted = [...new Set(required)].sort();
    await this.rules.updateOne(
      { _id: item },
      { $set: { required: sorted } },
      { upsert: true, session: this.session },
    );
    return {};
  }

  async untag({ item }: { item: string }): Promise<Record<string, never>> {
    const result = await this.rules.deleteOne({ _id: item }, { session: this.session });
    if (!result.deletedCount) throw new RequirementRuleNotFound();
    return {};
  }

  async _rule({ item }: { item: string }): Promise<{ required: string[] }[]> {
    const rule = await this.rules.findOne({ _id: item }, { session: this.session });
    return rule ? [{ required: [...rule.required] }] : [];
  }

  async _eligible({ item, tokens }: { item: string; tokens: string[] }): Promise<{ eligible: boolean }> {
    const rule = await this.rules.findOne({ _id: item }, { session: this.session });
    if (!rule) return { eligible: false };
    const available = new Set(tokens);
    return { eligible: rule.required.every((token) => available.has(token)) };
  }

  async _rulesForItems({ items }: { items: string[] }): Promise<{ item: string; required: string[] }[]> {
    const rows = await this.rules.find({ _id: { $in: items } }, { session: this.session }).sort({ _id: 1 }).toArray();
    return rows.map(({ _id, required }) => ({ item: _id, required: [...required] }));
  }

  async _itemsRequiringToken({ token }: { token: string }): Promise<{ item: string }[]> {
    const rows = await this.rules.find({ required: token }, { session: this.session }).sort({ _id: 1 }).toArray();
    return rows.map(({ _id }) => ({ item: _id }));
  }
}
