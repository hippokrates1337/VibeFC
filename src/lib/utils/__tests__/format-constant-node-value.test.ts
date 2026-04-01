import {
  formatConstantNodeValue,
  parseConstantNodeValueInput
} from '../format-constant-node-value';

describe('formatConstantNodeValue', () => {
  it('formats with de-DE grouping', () => {
    expect(formatConstantNodeValue(1234)).toBe('1.234');
    expect(formatConstantNodeValue(1234567.89)).toMatch(/1.*234.*567/);
  });

  it('handles non-finite', () => {
    expect(formatConstantNodeValue(Number.NaN)).toBe('-');
  });
});

describe('parseConstantNodeValueInput', () => {
  it('parses de-DE style numbers', () => {
    expect(parseConstantNodeValueInput('1.234')).toBe(1234);
    expect(parseConstantNodeValueInput('1.234,5')).toBe(1234.5);
    expect(parseConstantNodeValueInput('0,5')).toBe(0.5);
  });

  it('returns null for empty', () => {
    expect(parseConstantNodeValueInput('')).toBeNull();
    expect(parseConstantNodeValueInput('   ')).toBeNull();
  });

  it('handles sign', () => {
    expect(parseConstantNodeValueInput('-1.234,5')).toBe(-1234.5);
  });
});
