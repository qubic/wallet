import {
  detectVaultFileVersion,
  unlockV3VaultFile,
  VAULT_FILE_VERSION_LEGACY,
  VAULT_FILE_VERSION_V3,
} from './vault-file.helper';

/**
 * Fixtures are REAL v3 vault files created with @qubic.org/vault 1.2.1
 * (password 'v3-migration-test-2026'). The seeds inside are throwaway test
 * material and must never be funded.
 * - V3_SAMPLE: two spendable accounts + one watch-only account, publicIds
 *   genuinely derived from the seeds.
 * - V3_TRAP_WATCHONLY: a watch-only entry that illegally carries seed bytes;
 *   the flag must win and no seed may be exposed.
 * - V3_TRAP_GARBAGE: a spendable entry whose seed bytes are 512 random bytes;
 *   the vault must be rejected instead of importing a broken account.
 */
const V3_PASSWORD = 'v3-migration-test-2026';
const V3_SAMPLE_B64 =
  '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';
const V3_TRAP_WATCHONLY_B64 =
  'A8FS3TbiECgaH8f1m7zUkryCLxd4QRx1CWCVF0QsAf7gjq0YvwuP9tzqavIbZlfwMXj0mpCv1gmaxweOAzePJ0IN7h0eAT22QEDbldwehvyvpl1w39efabPLVMZVXww21Mz8rdO/dQsjxY5ftHcR7iAuGIPloT7QtrWBNKUSWzHrX4tCyp0g6/QgHI8Y93FP/ezVgjNWbaW/VSiVVisDreSuw2RcfkSlxvHTNxfJRL2rImDw8tD0lRh1BFA+JaK04uZr9XNS6vwLPdq5cY/Zn89QFUiRX/aa4aP59FqywG6BjhatTsp6TgnCzzRS4iig5l+I1HWk4ea9Va/T4RaBRpb2X2WNmrP/Vk0AQ7oKeIbJiu8uC1z/M3RSt2mavsSR8+zPcDIMW7bUFdcJiFus7SUuCOTf8nyIm5RnZ1+FXteCht7GrqdyHU1RFETarugpg+EZRKzXWqNQZP/H8nTauSsXWkBg7suT09c0nr9cph9LTFen/ocOv38YbAM9qB6PZ6ACrejNsqM++avdUd1toAvC7qaL5SBTYMI68XH45OAaSSRzE9jWrAPeQQjBwl3m2vAzPBw2FKhk/W8Ynt9WL+vSQQ3OXAsptMAR4MQjLCUZl2xq/PX5ATT2/PS+u8cSn9RZMmqQ3WVj0egwlHmwMstorPqogNJKOKbNE7htC1yO9lj1RIHcosMKhHXxh8NC/F0koPnBxObtOYZAGh5UdJwY3XetfHtJxW+A3M2Yjz/2sOtlT8vMpNUHrKVmAVsK8aTVqo161Pa9oimcKbkWg68i54b9593OktObv6G6R1BbQdWlU6Xvc4DAJnZNRsBuEg6Bp5+uScEHYzx7h/VbjRESkIZscHsK7rW9KIWrNaxgMGGH15BuifgPha1ZZ1Y0zLPqQKNqYHpC7mJ9Z4rSq2og9zIGPvRFHuDhoeVkv/v+tGXHFSxEjTLGKPDdIokLtU0G+Fey1BgOPKfYGaZXObGvIF9zQDTeEUVNPMS/PAXMg3zXR5wexy/yVQnzla2AOqjuizAoKFKAV54A6HNhyUwKeAZXNfnEcQGBzQno6A0JwDq12hAca8dyF63ZrpXHVZREpOcw0VwAVvm1Wo/IcdKMMWaCKqYhMpmclfUps4mFBWRIRE+RXB2WyW3vfd7kMSTFUrej3/2XVfYmCZRY9slkgvNsRe6yafAsOj8eAoAOpHO3g0cr+13K4rRfXRw5Pl6pX/z2zuYp6tnRu5bHd5wmImBxmBGYJAAYScD1/kg/zAXq7Ixm5TpWP1gwZ1GPuZ3ylGxgbmFX0myDvejUIh7ed+Yxq5puCFZnI8xJ8YBQ8RPPuanfnegArdv8mD7afUw1D6XOhUWsN0rHU/oOiY48OucB0z/6YLngzuSEddiqV5TIKd0mPshGWovalrgyTdbOts8Qy8cepYdwwfxUjdghVqeQS34wTxycRuiYNxy8LzgucREXHtgq5YHZHuptZgn7jPFeBZeaCL0T0cXwO7qXmc/USrGnC+8xtXWXQ2S+J8GNlMhmEwmSzKdggGfPkP07dMRI5HDHxz9fZIlfpX3uFrkINUK8f9bplFqNF0OGNfwhKBDpEjAjyO+vBDFgpA7EcFsGeywc76j8mgGqLAX+YL2/KtRMTV7Pyo74wowV6s1/qAGv9bvAtU/TK+MdcUHgszT+dhNbE8AiKNXYnsVKIRy0OTB5v/fGYhGEgurm6G/NaBtxl3YZnhE/WMk46579Ru1ttaMmuEbQo6cfx0x9AeJr7/hA2D0IDwa8J+bsalhpEJNVnTj8gea+/CYxhuh4XVVeYeicFs3fHFYNPQTmNsiGu7W/n3CDcaA=';
const V3_TRAP_GARBAGE_B64 =
  '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';

const V3_SAMPLE_EXPECTED = [
  {
    alias: 'Main Account',
    publicId: 'EKBLIMBIYPYCODFXUYJABWORXGLBEFPYUWFNONBKVERZYNLOODFSZOJEESVF',
    seed: 'qjsoeqyeiunepvfzuowqvghjqtpwsutybioqcvnbspbqewqeanpnupj',
    isOnlyWatch: false,
  },
  {
    alias: 'Savings Account',
    publicId: 'JNFUKQESJQKOAGCSMUSBTHCQVRSACVYWBJCIYETTJGIDJXTJOOHJTHLHVMAH',
    seed: 'suxbeedenoxeoeixfrloewvjynjntwwbvjpuetnkoqcxugxiuluidhu',
    isOnlyWatch: false,
  },
  {
    alias: 'Watch Only Account',
    publicId: 'OWRKMITDLKTZHCSIICTAAZPFGSKAHXEQZWMOGFMLDFKFKMCDDKNFTXFDBSZC',
    seed: '',
    isOnlyWatch: true,
  },
];

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return bytes.buffer;
}

function textToArrayBuffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer as ArrayBuffer;
}

const MINIMAL_V1_JSON = JSON.stringify({
  salt: 'c2FsdA==',
  iv: 'aXY=',
  cipher: 'Y2lwaGVy',
});

describe('detectVaultFileVersion', () => {
  it('should detect a v3 vault file', () => {
    expect(detectVaultFileVersion(base64ToArrayBuffer(V3_SAMPLE_B64))).toBe(
      VAULT_FILE_VERSION_V3
    );
  });

  it('should detect a v1 vault file', () => {
    expect(detectVaultFileVersion(textToArrayBuffer(MINIMAL_V1_JSON))).toBe(
      VAULT_FILE_VERSION_LEGACY
    );
  });

  it('should detect a v1 vault file with a BOM prefix', () => {
    expect(
      detectVaultFileVersion(textToArrayBuffer('\uFEFF' + MINIMAL_V1_JSON))
    ).toBe(VAULT_FILE_VERSION_LEGACY);
  });

  it('should detect a v1 vault file with leading whitespace', () => {
    expect(
      detectVaultFileVersion(textToArrayBuffer('  \n' + MINIMAL_V1_JSON))
    ).toBe(VAULT_FILE_VERSION_LEGACY);
  });

  it('should return null for random bytes', () => {
    const bytes = new Uint8Array(100);
    crypto.getRandomValues(bytes);
    bytes[0] = 0xab;
    expect(detectVaultFileVersion(bytes.buffer)).toBeNull();
  });

  it('should return null for a truncated v3 file', () => {
    const bytes = new Uint8Array(10);
    bytes[0] = 3;
    expect(detectVaultFileVersion(bytes.buffer)).toBeNull();
  });

  it('should return null for an empty file', () => {
    expect(detectVaultFileVersion(new ArrayBuffer(0))).toBeNull();
  });

  it('should return null for JSON that is not a vault', () => {
    expect(
      detectVaultFileVersion(textToArrayBuffer('{"salt":"x","iv":"y"}'))
    ).toBeNull();
  });
});

describe('unlockV3VaultFile', () => {
  it('should unlock a v3 vault and return all accounts', async () => {
    const seeds = await unlockV3VaultFile(
      base64ToArrayBuffer(V3_SAMPLE_B64),
      V3_PASSWORD
    );
    expect(seeds).toEqual(V3_SAMPLE_EXPECTED);
  });

  it('should reject a wrong password without reporting an invalid file', async () => {
    let error: unknown = null;
    try {
      await unlockV3VaultFile(base64ToArrayBuffer(V3_SAMPLE_B64), 'wrong-pw');
      fail('expected rejection');
    } catch (e) {
      error = e;
    }
    expect(error).not.toBe('INVALID VAULT FILE');
  });

  it('should reject a tampered v3 vault', async () => {
    const bytes = new Uint8Array(base64ToArrayBuffer(V3_SAMPLE_B64));
    bytes[bytes.length - 5] ^= 0xff;
    await expectAsync(
      unlockV3VaultFile(bytes.buffer, V3_PASSWORD)
    ).toBeRejected();
  });

  it('should reject a v1 vault file', async () => {
    await expectAsync(
      unlockV3VaultFile(textToArrayBuffer(MINIMAL_V1_JSON), V3_PASSWORD)
    ).toBeRejectedWith('INVALID VAULT FILE');
  });

  it('should never expose a seed carried by a watch-only entry', async () => {
    const seeds = await unlockV3VaultFile(
      base64ToArrayBuffer(V3_TRAP_WATCHONLY_B64),
      V3_PASSWORD
    );
    const watchOnly = seeds.find((s) => s.isOnlyWatch);
    expect(watchOnly).toBeDefined();
    expect(watchOnly!.seed).toBe('');
    const normal = seeds.find((s) => !s.isOnlyWatch);
    expect(normal!.seed).toBe('b'.repeat(55));
  });

  it('should reject a vault whose spendable seed is garbage bytes', async () => {
    await expectAsync(
      unlockV3VaultFile(base64ToArrayBuffer(V3_TRAP_GARBAGE_B64), V3_PASSWORD)
    ).toBeRejectedWith('INVALID VAULT FILE');
  });
});
