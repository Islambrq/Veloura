import { describe, it, expect } from 'vitest';
import { slugify } from '../slug';

describe('slugify', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugify('Fieldtone Over-Ear Headphones')).toBe('fieldtone-over-ear-headphones');
  });

  it('collapses non-alphanumeric runs into a single hyphen', () => {
    expect(slugify('Size: M / Color: Black!!')).toBe('size-m-color-black');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  --Hello World--  ')).toBe('hello-world');
  });

  it('handles already-slug-like input unchanged', () => {
    expect(slugify('already-a-slug')).toBe('already-a-slug');
  });
});
