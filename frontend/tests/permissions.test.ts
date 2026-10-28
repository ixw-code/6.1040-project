import { describe, expect, test } from 'bun:test';
import { isHubCreator, mayDeleteArticle, mayEditArticle } from '../src/lib/permissions.ts';

describe('frontend permission display rules', () => {
  test('any signed-in account can see article edit, not guests', () => {
    expect(mayEditArticle(false)).toBe(false);
    expect(mayEditArticle(true)).toBe(true);
  });
  test('hub management and article deletion are hub creator only', () => {
    const hub = { creator: 'user:alice' };
    expect(isHubCreator('user:alice', hub)).toBe(true);
    expect(isHubCreator('user:bob', hub)).toBe(false);
    expect(mayDeleteArticle('user:alice', hub)).toBe(true);
    expect(mayDeleteArticle('user:bob', hub)).toBe(false);
  });
  test('missing owner metadata never grants destructive controls', () => {
    expect(isHubCreator('user:alice', {})).toBe(false);
    expect(mayDeleteArticle('user:alice', undefined)).toBe(false);
    expect(isHubCreator(undefined, { creator: 'user:alice' })).toBe(false);
  });
});
