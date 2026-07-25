import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidPassword, isValidPostalCode } from '../validators';

describe('isValidEmail', () => {
  it('accepts a well-formed email', () => {
    expect(isValidEmail('person@example.com')).toBe(true);
  });

  it('rejects a string with no @', () => {
    expect(isValidEmail('personexample.com')).toBe(false);
  });

  it('rejects a string with no domain', () => {
    expect(isValidEmail('person@')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });
});

describe('isValidPassword', () => {
  it('rejects passwords under 8 characters', () => {
    expect(isValidPassword('short1')).toBe(false);
  });

  it('accepts an 8-character password', () => {
    expect(isValidPassword('exactly8')).toBe(true);
  });
});

describe('isValidPostalCode', () => {
  it('rejects codes shorter than 3 characters', () => {
    expect(isValidPostalCode('12')).toBe(false);
  });

  it('accepts a typical 5-digit US zip', () => {
    expect(isValidPostalCode('94103')).toBe(true);
  });

  it('trims whitespace before checking length', () => {
    expect(isValidPostalCode('  1 ')).toBe(false);
  });
});
