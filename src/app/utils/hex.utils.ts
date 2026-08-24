/**
 * Encodes a byte array as lowercase hex (2 chars per byte).
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Decodes a base64 string into bytes and re-encodes those bytes as lowercase
 * hex. Returns an empty string for empty input or if base64 decoding fails.
 */
export function base64ToHex(base64: string): string {
  if (!base64) return '';
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytesToHex(bytes);
  } catch {
    return '';
  }
}

/**
 * Decodes a hex string (case-insensitive, no 0x prefix) into bytes.
 * Throws if the input has odd length or contains non-hex characters.
 */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length === 0) return new Uint8Array(0);
  if (hex.length % 2 !== 0) {
    throw new Error(`hexToBytes: odd-length input (${hex.length})`);
  }
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(`hexToBytes: invalid hex character in input`);
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
