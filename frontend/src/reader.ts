const key = 'wikiplotter.reader';

export function readerIdentity(storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): string {
  try {
    const saved = storage.getItem(key);
    if (saved) return saved;
    const created = `reader-${crypto.randomUUID()}`;
    storage.setItem(key, created);
    return created;
  } catch {
    return `reader-${crypto.randomUUID()}`;
  }
}
