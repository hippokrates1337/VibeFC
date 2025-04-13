import '@testing-library/jest-dom';
import { cn } from '../utils';

describe('cn utility', () => {
  it('merges class names correctly', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('handles conditional classes', () => {
    const condition = true;
    expect(cn('class1', condition && 'class2')).toBe('class1 class2');
    expect(cn('class1', !condition && 'class2')).toBe('class1');
  });

  it('handles undefined values', () => {
    expect(cn('class1', undefined, 'class2')).toBe('class1 class2');
  });
}); 