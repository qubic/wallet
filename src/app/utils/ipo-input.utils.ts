import { bytesToHex, hexToBytes } from './hex.utils';

/**
 * 16-byte IPO bid payload as lowercase hex (matches QubicHelper.createIpo):
 * price int64 LE @0, quantity int16 LE @8, bytes 10-15 zero.
 */
export function encodeIpoInputHex(price: number, quantity: number): string {
  const input = new Uint8Array(16);
  const view = new DataView(input.buffer);
  view.setBigInt64(0, BigInt(price), true);
  view.setInt16(8, quantity, true);
  return bytesToHex(input);
}

/** Reverse of encodeIpoInputHex; null on empty/short/non-hex input (skip the entry). */
export function decodeIpoInputHex(hex: string): { price: number; quantity: number } | null {
  if (!hex) return null;
  let bytes: Uint8Array;
  try {
    bytes = hexToBytes(hex);
  } catch {
    return null;
  }
  if (bytes.length < 10) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    price: Number(view.getBigInt64(0, true)),
    quantity: view.getInt16(8, true),
  };
}
