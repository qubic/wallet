export interface IpoBidInfo {
  price: string;
  quantity: number;
}

export interface IpoBidTransaction {
  hash: string;
  amount: string;
  source: string;
  destination: string;
  tickNumber: number;
  timestamp: string;
  inputType: number;
  inputSize: number;
  inputData: string;
  signature: string;
  moneyFlew: boolean;
  bid: IpoBidInfo;
}

export interface CurrentIpoBidsContract {
  assetName: string;
  contractIndex: number;
  contractAddress: string;
  transactions: IpoBidTransaction[];
}

export interface IdentityAssetRecord {
  assetIssuer: string;
  assetName: string;
  managingContractIndex: number;
  numberOfShares: string;
  tickNumber: number;
}

export interface IdentityAssetEntry {
  identity: string;
  ownerships: IdentityAssetRecord[];
  possessions: IdentityAssetRecord[];
}

export interface IdentitiesAssetsResponse {
  identityAssets: IdentityAssetEntry[];
}
