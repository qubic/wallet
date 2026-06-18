const SEED_LENGTH = 55;
const SEED_ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

/**
 * Generates a cryptographically secure random seed.
 * Uses crypto.getRandomValues() to draw from the OS entropy pool.
 *
 * @returns A 55-character lowercase alphabetic seed
 */
export function generateSeed(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(SEED_LENGTH));
  return Array.from(randomBytes, (byte) => SEED_ALPHABET[byte % SEED_ALPHABET.length]).join('');
}
