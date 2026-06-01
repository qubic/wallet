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
