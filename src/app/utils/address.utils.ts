/**
 * Shortens an address by showing only the first and last 5 characters
 * with ellipsis in between.
 *
 * @param input The full address string
 * @returns Shortened address format (e.g., "ABCDE...VWXYZ") or original if <= 10 chars
 */
export function shortenAddress(input: string): string {
  if (input.length <= 10) {
    return input;
  }

  const start = input.slice(0, 5);
  const end = input.slice(-5);

  return `${start}...${end}`;
}
