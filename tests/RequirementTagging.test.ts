import { describe, expect, test } from 'bun:test';
import {
  RequirementTaggingConcept, RequirementRuleNotFound,
} from '@/concepts/RequirementTagging.ts';

describe('RequirementTagging', () => {
  test('missing rules deny, but an explicit empty rule permits', async () => {
    const c = new RequirementTaggingConcept();
    expect(await c._rule({ item: 'doc' })).toEqual([]);
    expect(await c._eligible({ item: 'doc', tokens: [] })).toEqual({ eligible: false });
    await c.tag({ item: 'doc', required: [] });
    expect(await c._rule({ item: 'doc' })).toEqual([{ required: [] }]);
    expect(await c._eligible({ item: 'doc', tokens: [] })).toEqual({ eligible: true });
    expect(await c._eligible({ item: 'doc', tokens: ['anything'] })).toEqual({ eligible: true });
  });

  test('requires all tokens, disregarding order and duplicates', async () => {
    const c = new RequirementTaggingConcept();
    await c.tag({ item: 'block', required: ['B', 'A', 'A'] });
    expect(await c._rule({ item: 'block' })).toEqual([{ required: ['A', 'B'] }]);
    expect(await c._eligible({ item: 'block', tokens: ['A'] })).toEqual({ eligible: false });
    expect(await c._eligible({ item: 'block', tokens: ['B', 'A', 'extra'] })).toEqual({ eligible: true });
  });

  test('replacing and removing rules change eligibility; items are independent', async () => {
    const c = new RequirementTaggingConcept();
    await c.tag({ item: 'doc', required: ['first'] });
    await c.tag({ item: 'block', required: [] });
    await c.tag({ item: 'doc', required: ['second'] });
    expect(await c._eligible({ item: 'doc', tokens: ['first'] })).toEqual({ eligible: false });
    expect(await c._eligible({ item: 'doc', tokens: ['second'] })).toEqual({ eligible: true });
    await c.untag({ item: 'doc' });
    expect(await c._eligible({ item: 'doc', tokens: ['second'] })).toEqual({ eligible: false });
    expect(await c._eligible({ item: 'block', tokens: [] })).toEqual({ eligible: true });
    await expect(c.untag({ item: 'doc' })).rejects.toBeInstanceOf(RequirementRuleNotFound);
  });

  test('neither caller input nor query output can mutate stored requirements', async () => {
    const c = new RequirementTaggingConcept();
    const required = ['one'];
    await c.tag({ item: 'doc', required });
    required.push('two');
    const rules = await c._rule({ item: 'doc' });
    rules[0]!.required.push('three');
    expect(await c._rule({ item: 'doc' })).toEqual([{ required: ['one'] }]);
  });
});
