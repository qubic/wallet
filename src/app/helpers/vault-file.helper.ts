import { VaultManager } from '@qubic.org/vault';

export const VAULT_FILE_VERSION_LEGACY = 1;
export const VAULT_FILE_VERSION_V3 = 3;

// version byte + 32-byte salt + 12-byte iv + 16-byte GCM tag
const V3_MIN_LENGTH = 61;

/** Same shape the export path enforces for spendable seeds. */
const SEED_PATTERN = /^[a-z]{55}$/;

/**
 * One account inside a vault file, whether read from or written to it.
 * `seed` is an empty string for watch-only accounts.
 */
export interface IVaultSeed {
  alias: string;
  publicId: string;
  seed: string;
  isOnlyWatch: boolean;
}

/** Seed entry shape inside a decrypted v3 vault payload (see @qubic.org/vault). */
interface IV3PayloadSeed {
  alias?: string;
  publicId: string;
  encryptedSeed?: Uint8Array;
  isOnlyWatch?: boolean;
}

/**
 * Detects the version of a vault file: 1 (legacy JSON `{salt,iv,cipher}`),
 * 3 (binary Argon2id envelope) or null if the file is neither.
 * Deliberately parses the JSON instead of sniffing the first byte, so a v1 file
 * carrying a BOM or leading whitespace still resolves (TextDecoder strips the BOM).
 */
export function detectVaultFileVersion(binaryFile: ArrayBuffer): number | null {
  const bytes = new Uint8Array(binaryFile);
  if (bytes[0] === VAULT_FILE_VERSION_V3 && bytes.length >= V3_MIN_LENGTH) {
    return VAULT_FILE_VERSION_V3;
  }
  try {
    const parsed = JSON.parse(new TextDecoder('utf-8').decode(bytes));
    if (
      parsed &&
      parsed.salt !== undefined &&
      parsed.iv !== undefined &&
      parsed.cipher !== undefined
    ) {
      return VAULT_FILE_VERSION_LEGACY;
    }
  } catch (e) {
    // not JSON -> not a v1 vault
  }
  return null;
}

/**
 * True when a decrypted vault lacks the seed material it should contain.
 *
 * Do not remove: `@qubic.org/vault@1.2.0` returned v1 accounts without decrypting
 * their seeds, and this guard is what keeps such a vault from being imported as a
 * set of unusable accounts. An empty list counts as missing for the same reason.
 */
function isMissingSeedMaterial(seeds: IVaultSeed[]): boolean {
  return (
    seeds.length === 0 ||
    seeds.some((s) => !s.isOnlyWatch && s.seed.length === 0)
  );
}

function mapPayloadSeeds(payloadSeeds: IV3PayloadSeed[]): IVaultSeed[] {
  const textDecoder = new TextDecoder();
  return (payloadSeeds ?? []).map((entry) => {
    const isOnlyWatch = entry.isOnlyWatch === true;
    const raw = entry.encryptedSeed;
    // The watch-only flag is authoritative. Shape-check the decoded seed too:
    // TextDecoder turns invalid bytes into U+FFFD rather than throwing, so without
    // this, garbage would reach the wallet as a spendable account.
    const decoded =
      !isOnlyWatch && raw && raw.length > 0 ? textDecoder.decode(raw) : '';
    return {
      alias: entry.alias ?? '',
      publicId: entry.publicId,
      seed: SEED_PATTERN.test(decoded) ? decoded : '',
      isOnlyWatch,
    };
  });
}

/**
 * Unlocks a v3 (Argon2id) vault file and returns its accounts.
 * Rejects with 'INVALID VAULT FILE' (the wallet's stable error string) when the file
 * is not a structurally valid v3 vault; a wrong password surfaces as the library's
 * decryption error, matching how the v1 path surfaces a raw WebCrypto error.
 */
export async function unlockV3VaultFile(
  binaryFile: ArrayBuffer,
  password: string
): Promise<IVaultSeed[]> {
  if (detectVaultFileVersion(binaryFile) !== VAULT_FILE_VERSION_V3) {
    return Promise.reject('INVALID VAULT FILE');
  }
  const manager = new VaultManager();
  const payload = await manager.unlock(new Uint8Array(binaryFile), password);
  const seeds = mapPayloadSeeds((payload?.seeds ?? []) as IV3PayloadSeed[]);
  if (isMissingSeedMaterial(seeds)) {
    return Promise.reject('INVALID VAULT FILE');
  }
  return seeds;
}

/**
 * Writes a v3 (Argon2id) vault file containing the given accounts.
 * The watch-only flag is authoritative: such an account is written without seed material
 * even if a seed was supplied. A spendable account must carry a valid seed, otherwise the
 * export is refused rather than producing a backup that cannot restore that account.
 */
export async function createV3VaultFile(
  password: string,
  seeds: IVaultSeed[],
  appVersion: string
): Promise<Uint8Array> {
  for (const seed of seeds) {
    if (!seed.isOnlyWatch && !SEED_PATTERN.test(seed.seed)) {
      return Promise.reject(
        'Account ' + seed.publicId + ' has no valid seed to export'
      );
    }
  }
  const textEncoder = new TextEncoder();
  const now = new Date().toISOString();
  const manager = new VaultManager();
  return manager.create(
    {
      seeds: seeds.map((seed) => ({
        publicId: seed.publicId,
        alias: seed.alias,
        taintStatus: 0,
        isOnlyWatch: seed.isOnlyWatch,
        ...(seed.isOnlyWatch
          ? {}
          : { encryptedSeed: textEncoder.encode(seed.seed) }),
      })),
      metadata: {
        createdAt: now,
        updatedAt: now,
        appVersion,
        schemaVersion: 3,
      },
    } as any,
    password
  );
}
