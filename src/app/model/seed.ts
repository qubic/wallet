import { QubicAsset } from "../services/api.model";

export interface ISeed {
    alias: string;
    publicId: string;
    // publicKey: Uint8Array; // currently not used
    encryptedSeed: string;
    balance: number;
    balanceTick: number;
    lastUpdate?: Date;
    assets?: QubicAsset[];
    isExported?: boolean;
}
export interface IDecodedSeed extends ISeed {
    seed: string;
}