import { ISeed } from '../model/seed';
import { AddressNameResult } from '../services/apis/static/qubic-static.model';

/**
 * The empty/null address in Qubic protocol
 * Used to represent null destinations or empty addresses
 */
export const EMPTY_QUBIC_ADDRESS = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFXIB';

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
 * Returns the display name for an address with shortened address in parentheses for known addresses.
 * If the address belongs to one of the wallet's accounts, returns the account alias with shortened address.
 * For known addresses (smart contracts, exchanges, etc.), returns the name with shortened address.
 * Otherwise, returns the full address.
 *
 * This method is reusable throughout the app for consistent address/name display.
 *
 * @param address The address to display
 * @param seeds Array of wallet seeds/accounts
 * @param addressNameResult Optional result from AddressNameService for enhanced display
 * @returns Display name with shortened address in parentheses
 *
 * @example
 * // Address belongs to wallet
 * getDisplayName("ABCDEFGHIJKLMNOPQRSTUVWXYZ12345", seeds) // Returns "My Main Account (ABCDE...12345)"
 *
 * // Address not in wallet
 * getDisplayName("DEFGHIJKLMNOPQRSTUVWXYZ67890", seeds) // Returns "DEFGHIJKLMNOPQRSTUVWXYZ67890"
 *
 * // With addressNameResult (known address like smart contract)
 * getDisplayName("...", seeds, { name: "Qx", type: "smart-contract" }) // Returns "Qx (ABCDE...VWXYZ)"
 */
export function getDisplayName(address: string, seeds: ISeed[], addressNameResult?: AddressNameResult): string {
  if (!address || !seeds) {
    return address || '';
  }

  // Priority 1: Check wallet seeds (account) - show shortened address for user's own accounts
  const seed = seeds.find(s => s.publicId === address);
  if (seed) {
    return `${seed.alias} (${shortenAddress(address)})`;
  }

  // Priority 2: Use addressNameResult if provided - show shortened address for known addresses
  if (addressNameResult) {
    return `${addressNameResult.name} (${shortenAddress(address)})`;
  }

  return address;
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
 * @param addressNameResult Optional result from AddressNameService for enhanced display
 * @returns Account alias with shortened address in parentheses if in wallet, otherwise shortened address (e.g., "ABCDE...12345")
 *
 * @example
 * // Address belongs to wallet
 * getShortDisplayName("ABCDEFGHIJKLMNOPQRSTUVWXYZ12345", seeds) // Returns "My Main Account (ABCDE...12345)"
 *
 * // Address not in wallet
 * getShortDisplayName("DEFGHIJKLMNOPQRSTUVWXYZ67890", seeds) // Returns "DEFGH...67890"
 *
 * // With addressNameResult
 * getShortDisplayName("...", seeds, { name: "Qx", type: "smart-contract" }) // Returns "Qx (ABCDE...12345)"
 */
export function getShortDisplayName(address: string, seeds: ISeed[], addressNameResult?: AddressNameResult): string {
  if (!address || !seeds) {
    return address || '';
  }

  // Priority 1: Check wallet seeds (account)
  const seed = seeds.find(s => s.publicId === address);
  if (seed) {
    return `${seed.alias} (${shortenAddress(address)})`;
  }

  // Priority 2: Use addressNameResult if provided
  if (addressNameResult) {
    return `${addressNameResult.name} (${shortenAddress(address)})`;
  }

  return shortenAddress(address);
}
