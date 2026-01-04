/**
 * Parses a formatted number string and returns the integer value.
 * Supports multiple formats:
 * 1. US: 1,234,567 or 1,234,567.89 (comma thousands, dot decimal)
 * 2. EU: 1.234.567 or 1.234.567,89 (dot thousands, comma decimal)
 * 3. CH: 1'234'567 or 1'234'567.89 (apostrophe thousands, dot decimal)
 * Decimals are always stripped (Qubic only supports integers).
 * Falls back to stripping non-digits if no format matched.
 */
export function parseFormattedInteger(value: string): number | null {
  if (!value) return 0;

  const trimmed = value.trim();

  // 1. US format: optional comma thousands, optional dot decimal
  if (/^(\d{1,3}(,\d{3})*|\d+)(\.\d+)?$/.test(trimmed)) {
    const integerPart = trimmed.split('.')[0];
    return Number(integerPart.replace(/,/g, '')) || 0;
  }

  // 2. EU format (checked after US): dot thousands and/or comma decimal
  if (/^(\d{1,3}(\.\d{3})+|\d+)(,\d+)?$/.test(trimmed)) {
    const integerPart = trimmed.split(',')[0];
    return Number(integerPart.replace(/\./g, '')) || 0;
  }

  // 3. CH format: apostrophe thousands, optional dot decimal
  if (/^\d{1,3}('\d{3})+(\.\d+)?$/.test(trimmed)) {
    const integerPart = trimmed.split('.')[0];
    return Number(integerPart.replace(/'/g, '')) || 0;
  }

  // No valid format matched
  return null;
}
