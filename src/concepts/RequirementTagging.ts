/** Required token rules for items. */
export class RequirementRuleNotFound extends Error {}

export class RequirementTaggingConcept {
  private readonly rules = new Map<string, string[]>();

  async tag({ item, required }: { item: string; required: string[] }): Promise<void> {
    this.rules.set(item, [...new Set(required)].sort());
  }

  async untag({ item }: { item: string }): Promise<void> {
    if (!this.rules.delete(item)) throw new RequirementRuleNotFound();
  }

  async _rule({ item }: { item: string }): Promise<{ required: string[] }[]> {
    const required = this.rules.get(item);
    return required === undefined ? [] : [{ required: [...required] }];
  }

  async _eligible({ item, tokens }: {
    item: string; tokens: string[];
  }): Promise<{ eligible: boolean }> {
    const required = this.rules.get(item);
    if (required === undefined) return { eligible: false };
    const supplied = new Set(tokens);
    return { eligible: required.every((token) => supplied.has(token)) };
  }
}
