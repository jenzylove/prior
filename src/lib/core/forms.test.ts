import { describe, it, expect } from 'vitest';
import { FORMS, FORM_META } from './forms';
import type { FactKind, FormId } from './types';

const KINDS: FactKind[] = ['identity', 'trip', 'employment', 'address', 'education', 'finance', 'family', 'application', 'refusal', 'lesson'];

describe.each(Object.keys(FORMS) as FormId[])('form %s', (id) => {
  const qs = FORMS[id];
  it('has 20+ questions', () => expect(qs.length).toBeGreaterThanOrEqual(20));
  it('has unique ids', () => expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length));
  it('has a disclosure question mapped to refusal', () =>
    expect(qs.some((q) => q.disclosure && q.maps?.includes('refusal'))).toBe(true));
  it('maps only valid fact kinds', () => {
    for (const q of qs) for (const m of q.maps ?? []) expect(KINDS).toContain(m);
  });
  it('has meta', () => expect(FORM_META[id].officialUrl).toMatch(/^https:\/\//));
});
