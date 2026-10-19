import { expect, test } from 'bun:test';
import { readerIdentity } from '@frontend/reader.ts';

test('the same browser storage keeps a reader identity across app loads', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  const first = readerIdentity(storage);
  expect(first).toStartWith('reader-');
  expect(readerIdentity(storage)).toBe(first);
  expect(readerIdentity({ getItem: () => null, setItem: () => {} })).not.toBe(first);
});
