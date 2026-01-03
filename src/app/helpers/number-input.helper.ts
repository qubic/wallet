/**
 * Parses a formatted number string and returns the integer value.
 * Handles both US (1,234.56) and EU (1.234,56) formats.
 *
 * - No dot (only commas/apostrophes) = all thousand separators from formatter
 * - Multiple dots (no commas) = EU thousand separators (e.g., 1.000.000 → 1000000)
 * - Single dot (no comma) = decimal (e.g., 123.45 → 123)
 * - Mixed (dot + comma) = detect decimal by digit count
 */
export function parseFormattedInteger(value: string): number | null {
  if (!value) return 0;

  const dotCount = (value.match(/\./g) || []).length;
  const hasCommaOrApostrophe = /[,']/.test(value);

  let numericString: string;

  // Only commas/apostrophes (no dots) = all thousand separators from our formatter
  // OR multiple dots (no commas) = EU format thousand separators (e.g., 1.000.000)
  if ((!dotCount && hasCommaOrApostrophe) || (dotCount > 1 && !hasCommaOrApostrophe)) {
    numericString = value.replace(/\D/g, '');
  }
  // Single dot only (no comma) = decimal
  else if (dotCount === 1 && !hasCommaOrApostrophe) {
    const integerPart = value.replace(/\.\d*$/, '');
    numericString = integerPart.replace(/\D/g, '');
  }
  // Mixed separators: detect decimal by digit count (1-2 or 4+ digits after last separator)
  else {
    const integerPart = value.replace(/[.,'](\d{1,2}|\d{4,})$/, '');
    numericString = integerPart.replace(/\D/g, '');
  }

  // Reject if exceeds 15 digits (JavaScript's safe integer limit)
  if (numericString.length > 15) {
    return null; // Signal to caller: don't update, keep previous value
  }

  const numericalValue = Number(numericString);
  return isNaN(numericalValue) ? 0 : numericalValue;
}
