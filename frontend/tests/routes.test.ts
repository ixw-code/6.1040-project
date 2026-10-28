import { describe, expect, test } from 'bun:test';
import { hubUrl, welcomeUrl, settingsUrl, articleUrl, editUrl, newArticleUrl, assetUrl,
  rememberArticleDirectory, rememberHubDirectory, rememberHubSlug } from '../src/lib/routes.ts';
import { legacyMediaSource } from '../src/lib/legacyMedia.ts';

describe('frontend route links', () => {
  test('encodes hub and document identifiers in stable paths', () => {
    expect(hubUrl('hub:one')).toBe('/hub%3Aone');
    expect(welcomeUrl('hub:one')).toBe('/hub%3Aone/welcome');
    expect(settingsUrl('hub:one')).toBe('/hub%3Aone/settings');
    expect(articleUrl('hub:one', 'document:two')).toBe('/hub%3Aone/document%3Atwo');
    expect(editUrl('hub:one', 'document:two')).toBe('/hub%3Aone/document%3Atwo/edit');
    expect(newArticleUrl('hub:one')).toBe('/hub%3Aone/articles/new');
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
    expect(hubUrl('unlisted-hub')).toBe('/unlisted-hub');
  });
});
