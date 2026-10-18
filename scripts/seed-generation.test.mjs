// Run with: node --experimental-strip-types --test scripts/seed-generation.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateSeed } from '../src/app/utils/seed.utils.ts';

test('generates compatible seeds using the real secure random source', () => {
  for (let i = 0; i < 100; i++) {
    assert.match(generateSeed(), /^[a-z]{55}$/);
  }
});

test('maps all accepted byte values evenly and rejects bytes 234 through 255', (t) => {
  let nextByte = 0;
  t.mock.method(globalThis.crypto, 'getRandomValues', (bytes) => {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = nextByte++ % 256;
    }
    return bytes;
  });
  const expected = 'abcdefghijklmnopqrstuvwxyz'.repeat(9);
  // 64-byte batches overlap the rejection boundary in the fourth seed.
  for (let start = 0; start < 256; start += 64) {
    nextByte = start;
    const accepted = expected.slice(start) + expected;
    assert.equal(generateSeed(), accepted.slice(0, 55));
  }
});

test('refills when an entire batch is rejected', (t) => {
  let calls = 0;
  t.mock.method(globalThis.crypto, 'getRandomValues', (bytes) => {
    bytes.fill(calls++ === 0 ? 255 : 233);
    return bytes;
  });
  assert.equal(generateSeed(), 'z'.repeat(55));
  assert.equal(calls, 2);
});

test('propagates secure random source failures', (t) => {
  t.mock.method(globalThis.crypto, 'getRandomValues', () => {
    throw new Error('Random source failed');
  });
  assert.throws(generateSeed, /Random source failed/);
});

test('fails closed when Web Crypto is unavailable', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  try {
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined });
    assert.throws(generateSeed, /Secure random number generation is unavailable/);
  } finally {
    Object.defineProperty(globalThis, 'crypto', descriptor);
  }
});
