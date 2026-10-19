/** Reader-scoped progress checkpints. */
export class ProgressRecordingConcept {
  private readonly records = new Map<string, Map<string, string>>();

  async record({ scope, reader, checkpoint }: {
    scope: string; reader: string; checkpoint: string;
  }): Promise<void> {
    let readers = this.records.get(scope);
    if (!readers) {
      readers = new Map();
      this.records.set(scope, readers);
    }
    readers.set(reader, checkpoint);
  }

  async clear({ scope, reader }: { scope: string; reader: string }): Promise<{ cleared: boolean }> {
    const readers = this.records.get(scope);
    const cleared = readers?.delete(reader) ?? false;
    if (readers?.size === 0) this.records.delete(scope);
    return { cleared };
  }

  async _checkpoint({ scope, reader }: {
    scope: string; reader: string;
  }): Promise<{ checkpoint: string }[]> {
    const checkpoint = this.records.get(scope)?.get(reader);
    return checkpoint === undefined ? [] : [{ checkpoint }];
  }
}
