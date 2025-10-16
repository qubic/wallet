import { ISeed } from '../model/seed';

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

/**
 * Returns the display name for an address. If the address belongs to one of the wallet's
 * accounts, returns the account alias with the full address in parentheses.
 * Otherwise, returns the full address.
 *
 * This method is reusable throughout the app for consistent address/name display.
 *
 * @param address The address to display
 * @param seeds Array of wallet seeds/accounts
 * @returns Account alias with full address in parentheses if in wallet, otherwise full address
 *
 * @example
 * // Address belongs to wallet
 * getDisplayName("ABCDEFGHIJKLMNOPQRSTUVWXYZ12345", seeds) // Returns "My Main Account (ABCDEFGHIJKLMNOPQRSTUVWXYZ12345)"
 *
 * // Address not in wallet
 * getDisplayName("DEFGHIJKLMNOPQRSTUVWXYZ67890", seeds) // Returns "DEFGHIJKLMNOPQRSTUVWXYZ67890"
 */
export function getDisplayName(address: string, seeds: ISeed[]): string {
  if (!address || !seeds) {
    return address || '';
  }

  const seed = seeds.find(s => s.publicId === address);
  return seed ? `${seed.alias} (${shortenAddress(address)})` : address;
}

/**
 * Returns the short display name for an address. If the address belongs to one of the wallet's
 * accounts, returns the account alias with the shortened address in parentheses.
 * Otherwise, returns the shortened address.
 *
 * This method is reusable throughout the app for consistent short address/name display.
 *
 * @param address The address to display
 * @param seeds Array of wallet seeds/accounts
 * @returns Account alias with shortened address in parentheses if in wallet, otherwise shortened address (e.g., "ABCDE...12345")
 *
 * @example
 * // Address belongs to wallet
 * getShortDisplayName("ABCDEFGHIJKLMNOPQRSTUVWXYZ12345", seeds) // Returns "My Main Account (ABCDE...12345)"
 *
 * // Address not in wallet
 * getShortDisplayName("DEFGHIJKLMNOPQRSTUVWXYZ67890", seeds) // Returns "DEFGH...67890"
 */
export function getShortDisplayName(address: string, seeds: ISeed[]): string {
  if (!address || !seeds) {
    return address || '';
  }

  const seed = seeds.find(s => s.publicId === address);
  return seed ? `${seed.alias} (${shortenAddress(address)})` : shortenAddress(address);
}
