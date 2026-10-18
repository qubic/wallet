/** Generate a Qubic seed using cryptographically secure, unbiased randomness. */
export function generateSeed(): string {
  const crypto = globalThis.crypto;
  if (!crypto || typeof crypto.getRandomValues !== 'function') {
    throw new Error('Secure random number generation is unavailable.');
  }

  const letters = 'abcdefghijklmnopqrstuvwxyz';
  // 234 is the largest multiple of 26 below 256. Reject the remaining
  // byte values so modulo does not favor some letters over others.
  const limit = 256 - (256 % letters.length);
  const bytes = new Uint8Array(64);
  let seed = '';

  while (seed.length < 55) {
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte < limit) {
        seed += letters[byte % letters.length];
        if (seed.length === 55) {
          break;
        }
      }
    }
  }

  return seed;
}
