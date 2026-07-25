import { describe, it, expect } from 'vitest';
import { formatPrice, formatDate, slugToTitle } from '../format';

describe('formatPrice', () => {
  it('formats whole dollar amounts with two decimal places', () => {
    expect(formatPrice(20)).toBe('$20.00');
  });

  it('formats fractional cents correctly', () => {
    expect(formatPrice(19.9)).toBe('$19.90');
  });

  it('supports other currencies', () => {
    expect(formatPrice(10, 'EUR')).toContain('10.00');
  });

  it('formats zero without throwing', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });
});

describe('formatDate', () => {
  it('formats an ISO date into a short human-readable form', () => {
    const result = formatDate('2026-01-15T00:00:00.000Z');
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/2026/);
  });
});

describe('slugToTitle', () => {
  it('converts a hyphenated slug into title case', () => {
    expect(slugToTitle('waypoint-24l-backpack')).toBe('Waypoint 24l Backpack');
  });

  it('handles a single word', () => {
    expect(slugToTitle('outdoors')).toBe('Outdoors');
  });
});
