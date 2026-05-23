/**
 * Encodes a byte array as "shifted hex" using the A-P alphabet where each
 * byte is represented by 2 uppercase characters (A=0, B=1, ..., P=15).
 *
 * This encoding is used by the Qubic.NET Wallet and Toolkit for message
 * signatures.
 *
 * @param bytes The byte array to encode
 * @returns The shifted hex string (2 chars per input byte)
 */
export function encodeShiftedHex(bytes: Uint8Array): string {
  let result = '';
  const A = 'A'.charCodeAt(0);
  for (let i = 0; i < bytes.length; i++) {
    result += String.fromCharCode(A + (bytes[i] >> 4));
    result += String.fromCharCode(A + (bytes[i] & 0x0F));
  }
  return result;
}

/**
 * Decodes a "shifted hex" string (A-P alphabet) back into a byte array.
 * Accepts both uppercase and lowercase input.
 *
 * @param str The shifted hex string (must have even length, chars A-P / a-p)
 * @returns The decoded byte array (length = str.length / 2)
 * @throws Error if the string contains characters outside the A-P / a-p range
 */
export function decodeShiftedHex(str: string): Uint8Array {
  const upper = str.toUpperCase();
  const A = 'A'.charCodeAt(0);
  const bytes = new Uint8Array(upper.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const hi = upper.charCodeAt(i * 2) - A;
    const lo = upper.charCodeAt(i * 2 + 1) - A;
    if (hi < 0 || hi > 15 || lo < 0 || lo > 15) {
      throw new Error('Invalid shifted hex character');
    }
    bytes[i] = (hi << 4) | lo;
  }
  return bytes;
}
