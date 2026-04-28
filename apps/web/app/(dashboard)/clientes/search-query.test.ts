import { describe, expect, it } from 'vitest';
import { buildClientsSearchFilter } from './search-query';

describe('buildClientsSearchFilter', () => {
  it('returns null for empty input', () => {
    expect(buildClientsSearchFilter('')).toBeNull();
    expect(buildClientsSearchFilter('   ')).toBeNull();
  });

  it('returns name-only filter for short alpha queries', () => {
    expect(buildClientsSearchFilter('Maria')).toBe('name.ilike.%Maria%');
  });

  it('does not add phone filter for queries with fewer than 4 digits', () => {
    expect(buildClientsSearchFilter('Ana 12')).toBe('name.ilike.%Ana 12%');
  });

  it('adds phone filter when 4+ digits are present', () => {
    expect(buildClientsSearchFilter('9876')).toBe(
      'name.ilike.%9876%,phone_e164.ilike.%9876%',
    );
  });

  it('strips formatting punctuation from phone digits and sanitizes name term', () => {
    // Parens are stripped from the name term (replaced with spaces) AND the
    // phone leg uses digits-only.
    expect(buildClientsSearchFilter('(11) 98765-4321')).toBe(
      'name.ilike.% 11  98765-4321%,phone_e164.ilike.%11987654321%',
    );
  });

  it('sanitizes parens and commas from name term to avoid PostgREST OR conflicts', () => {
    // Comma + paren are filter separators in PostgREST .or() — must be neutralized.
    const out = buildClientsSearchFilter('Smith, J. (Mr)');
    expect(out).not.toContain(',');
    expect(out).not.toContain('(');
    expect(out).not.toContain(')');
  });

  it('normalizes raw 11-digit phone input', () => {
    const out = buildClientsSearchFilter('11987654321');
    expect(out).toContain('phone_e164.ilike.%11987654321%');
  });

  it('counts only digit characters for the 4+ threshold', () => {
    // 3 digits + spaces — should not include phone leg
    expect(buildClientsSearchFilter('99 8')).toBe('name.ilike.%99 8%');
  });
});
