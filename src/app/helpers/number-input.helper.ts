/**
 * Parses a formatted number string and returns the integer value.
 * Handles both US (1,234.56) and EU (1.234,56) formats.
 *
 * Single dot = decimal separator
 * Single comma/apostrophe = thousand separator
 * Multiple separators = detect by digit count after last separator
 */
export function parseFormattedInteger(value: string): number {
  if (!value) return 0;

  const separatorCount = (value.match(/[.,']/g) || []).length;
  const hasSingleDotOnly = separatorCount === 1 && /\./.test(value);

  const integerPart = hasSingleDotOnly
    ? value.replace(/\.\d*$/, '')
    : value.replace(/[.,'](\d{1,2}|\d{4,})$/, '');

  const numericalValue = Number(integerPart.replace(/\D/g, ''));

  return isNaN(numericalValue) ? 0 : numericalValue;
}
