import { cn } from '@/lib/utils';

describe('cn (classNames utility)', () => {
  it('joins classes with a space', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('filters out falsy values', () => {
    expect(cn('a', false, 'b', null, undefined, 0, 'c')).toBe('a b c');
  });

  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('');
  });

  it('returns empty string when all falsy', () => {
    expect(cn(false, null, undefined)).toBe('');
  });

  it('handles single class', () => {
    expect(cn('btn-primary')).toBe('btn-primary');
  });
});
