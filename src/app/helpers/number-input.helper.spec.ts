import { parseFormattedInteger } from './number-input.helper';

describe('parseFormattedInteger', () => {
  describe('US format (comma thousands, dot decimal)', () => {
    it('should parse plain numbers', () => {
      expect(parseFormattedInteger('0')).toBe(0);
      expect(parseFormattedInteger('5')).toBe(5);
      expect(parseFormattedInteger('123')).toBe(123);
      expect(parseFormattedInteger('1234567')).toBe(1234567);
      expect(parseFormattedInteger('  1234  ')).toBe(1234);  // whitespace trimmed
    });

    it('should parse comma-separated thousands', () => {
      expect(parseFormattedInteger('1,234')).toBe(1234);
      expect(parseFormattedInteger('1,234,567')).toBe(1234567);
      expect(parseFormattedInteger('12,345,678')).toBe(12345678);
      expect(parseFormattedInteger('  1,234  ')).toBe(1234);  // whitespace trimmed
    });

    it('should strip decimal portion', () => {
      expect(parseFormattedInteger('1234.56')).toBe(1234);
      expect(parseFormattedInteger('1.234')).toBe(1);  // US decimal, not EU thousands
      expect(parseFormattedInteger('1,234.56')).toBe(1234);
      expect(parseFormattedInteger('1,234,567.89')).toBe(1234567);
    });
  });

  describe('EU format (dot thousands, comma decimal)', () => {
    it('should parse dot-separated thousands (requires multiple groups)', () => {
      // Note: '1.234' matches US format first (returns 1, treating .234 as decimal)
      expect(parseFormattedInteger('1.234.567')).toBe(1234567);
      expect(parseFormattedInteger('12.345.678')).toBe(12345678);
    });

    it('should strip comma decimal portion', () => {
      expect(parseFormattedInteger('1.234,56')).toBe(1234);
      expect(parseFormattedInteger('1.234.567,89')).toBe(1234567);
    });

    it('should handle EU decimal-only format', () => {
      expect(parseFormattedInteger('1,23')).toBe(1);
      expect(parseFormattedInteger('1234,56')).toBe(1234);
      expect(parseFormattedInteger('1,2345')).toBe(1);      // any number of decimal digits
      expect(parseFormattedInteger('1234,563333')).toBe(1234);
    });
  });

  describe('CH/Swiss format (apostrophe thousands)', () => {
    it('should parse apostrophe-separated thousands', () => {
      expect(parseFormattedInteger("1'234")).toBe(1234);
      expect(parseFormattedInteger("1'234'567")).toBe(1234567);
      expect(parseFormattedInteger("12'345'678")).toBe(12345678);
    });

    it('should strip decimal portion', () => {
      expect(parseFormattedInteger("1'234.56")).toBe(1234);
      expect(parseFormattedInteger("1'234'567.89")).toBe(1234567);
    });
  });

  describe('Edge cases', () => {
    it('should return 0 for empty/null/undefined', () => {
      expect(parseFormattedInteger('')).toBe(0);
      expect(parseFormattedInteger(null as any)).toBe(0);
      expect(parseFormattedInteger(undefined as any)).toBe(0);
    });

    it('should parse large numbers', () => {
      expect(parseFormattedInteger('1234567890123456')).toBe(1234567890123456);
    });
  });

  describe('Invalid formats (return null)', () => {
    it('should return null for non-numeric strings', () => {
      expect(parseFormattedInteger('abc')).toBeNull();
      expect(parseFormattedInteger('---')).toBeNull();
    });

    it('should return null for mixed alphanumeric', () => {
      expect(parseFormattedInteger('abc123def')).toBeNull();
      expect(parseFormattedInteger('$1234')).toBeNull();
    });
  });
});
