import { describe, expect, test } from 'bun:test';
import { hubUrl, welcomeUrl, settingsUrl, articleUrl, articleCancelUrl, editUrl, newArticleUrl, assetUrl,
  rememberArticleDirectory, rememberHubDirectory, rememberHubSlug, routeFromPath, articleBreadcrumbs } from '../src/lib/routes.ts';
import { legacyMediaSource } from '../src/lib/legacyMedia.ts';

describe('frontend route links', () => {
  test('encodes only backend-resolved readable slugs and article titles', () => {
    rememberHubDirectory([{ hub: 'hub:one', slug: 'star-harbor' }]);
    rememberArticleDirectory('hub:one', [{ document: 'document:two', title: 'A/B: The Long Way' }]);
    expect(hubUrl('hub:one')).toBe('/star-harbor');
    expect(welcomeUrl('hub:one')).toBe('/star-harbor/welcome');
    expect(settingsUrl('hub:one')).toBe('/star-harbor/settings');
    expect(articleUrl('hub:one', 'document:two')).toBe('/star-harbor/A%2FB%3A%20The%20Long%20Way');
    expect(editUrl('hub:one', 'document:two')).toBe('/star-harbor/A%2FB%3A%20The%20Long%20Way/edit');
    expect(newArticleUrl('hub:one')).toBe('/star-harbor/articles/new');
    expect(assetUrl('asset:id')).toBe('/assets/asset%3Aid');
  });
  test('legacy Alpha images remain readable without opening unsafe schemes', () => {
    expect(legacyMediaSource('/image.png')).toBe('/image.png');
    expect(legacyMediaSource('data:image/svg+xml;charset=UTF-8,%3Csvg')).toContain('data:image');
    expect(legacyMediaSource('javascript:alert(1)')).toBeUndefined();
    expect(legacyMediaSource('asset:private-id')).toBeUndefined();
  });
  test('uses the readable slug while preserving the hub identity for API operations', () => {
    rememberHubDirectory([{ hub: 'hub:internal-id', slug: 'star-harbor' }]);
    rememberArticleDirectory('hub:internal-id', [{ document: 'doc:1', title: 'Opening' }]);
    expect(hubUrl('hub:internal-id')).toBe('/star-harbor');
    expect(articleUrl('hub:internal-id', 'doc:1')).toBe('/star-harbor/Opening');
    expect(settingsUrl('hub:internal-id')).toBe('/star-harbor/settings');
    rememberHubSlug('hub:internal-id', 'north-star');
    expect(hubUrl('hub:internal-id')).toBe('/north-star');
    expect(() => hubUrl('unlisted-hub')).toThrow('No backend-resolved slug');
  });
  test('ignores query strings and hashes when matching routes (regression: login navigation)', () => {
    expect(routeFromPath('/login?returnTo=%2Fstar-harbor')).toEqual({ kind: 'login' });
    expect(routeFromPath('/account/settings#account')).toEqual({ kind: 'account-settings' });
    expect(routeFromPath('/star-harbor/Opening/edit?from=article')).toEqual({ kind: 'article-edit', hub: 'star-harbor', document: 'Opening' });
  });
  test('resolves decoded readable route parameters and exact breadcrumb levels', () => {
    expect(routeFromPath('/star-harbor/A%2FB%3A%20The%20Long%20Way/edit')).toEqual({
      kind: 'article-edit', hub: 'star-harbor', document: 'A/B: The Long Way',
    });
    expect(articleBreadcrumbs('Star Harbor')).toEqual(['Star Harbor']);
    expect(articleBreadcrumbs('Star Harbor', 'A/B: The Long Way')).toEqual(['Star Harbor', 'A/B: The Long Way']);
    expect(articleBreadcrumbs('Star Harbor', 'A/B: The Long Way', true)).toEqual(['Star Harbor', 'A/B: The Long Way', 'Editing']);
  });
  test('article cancel keeps the saved title route after a draft title change', () => {
    rememberHubDirectory([{ hub: 'hub:one', slug: 'star-harbor' }]);
    expect(articleCancelUrl('hub:one', 'document:two', 'Saved: Title / One'))
      .toBe('/star-harbor/Saved%3A%20Title%20%2F%20One');
  });
});
