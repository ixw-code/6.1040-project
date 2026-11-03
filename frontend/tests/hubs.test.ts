import { describe, expect, test } from 'bun:test';
import { hubDeleteConfirmationMatches } from '../src/features/Hub/hub-settings.ts';

describe('hub deletion confirmation', () => {
  test('requires the exact current hub name', () => {
    expect(hubDeleteConfirmationMatches('Star Harbor', 'Star Harbor')).toBe(true);
    expect(hubDeleteConfirmationMatches('star harbor', 'Star Harbor')).toBe(false);
    expect(hubDeleteConfirmationMatches('Star Harbor ', 'Star Harbor')).toBe(false);
    expect(hubDeleteConfirmationMatches('Anything', '')).toBe(false);
  });
});
