import { ISeed } from "./seed";

export interface IConfig {
    name?: string; // wallet name
    seeds: ISeed[];
    publicKey?: JsonWebKey;
    tickAddition: number;
    numberLastEpoch: number;
}

/**
 * interface for the vault file definition
 */
export interface IVaultFile {
    privateKey: string; /* base64 */
    publicKey: JsonWebKey;
    configuration: IConfig
}

export interface IEncryptedVaultFile {
    salt: string;
    iv: string;
    cipher: string;
}