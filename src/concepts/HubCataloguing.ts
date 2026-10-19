/** Unique Hub scopes. */
export class HubNameRequired extends Error {}
export class HubNameTaken extends Error {}
export class HubNotFound extends Error {}
export class HubRenameNameRequired extends Error {}
export class HubRenameNameTaken extends Error {}

type Hub = { hub: string; name: string };

export class HubCataloguingConcept {
  private readonly hubs = new Map<string, Hub>();

  async create({ name }: { name: string }): Promise<{ hub: string }> {
    const trimmed = name.trim();
    if (!trimmed) throw new HubNameRequired();
    if ([...this.hubs.values()].some((hub) => hub.name === trimmed)) {
      throw new HubNameTaken();
    }
    const hub = crypto.randomUUID();
    this.hubs.set(hub, { hub, name: trimmed });
    return { hub };
  }

  async rename({ hub, name }: { hub: string; name: string }): Promise<{ hub: string }> {
    const found = this.hubs.get(hub);
    if (!found) throw new HubNotFound();
    const trimmed = name.trim();
    if (!trimmed) throw new HubRenameNameRequired();
    if ([...this.hubs.values()].some((other) => other.hub !== hub && other.name === trimmed)) {
      throw new HubRenameNameTaken();
    }
    found.name = trimmed;
    return { hub };
  }

  async _hub({ hub }: { hub: string }): Promise<{ name: string }[]> {
    const found = this.hubs.get(hub);
    return found ? [{ name: found.name }] : [];
  }

  async _hubs(_input: Record<string, never> = {}): Promise<Hub[]> {
    return [...this.hubs.values()]
      .map(({ hub, name }) => ({ hub, name }))
      .sort((a, b) => a.hub < b.hub ? -1 : a.hub > b.hub ? 1 : 0);
  }
}
