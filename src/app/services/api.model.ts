export interface AuthResponse {
  success?: boolean;
  token?: string | null;
  refreshToken?: string | null;
  privileges?: Array<string> | null;
}

export interface CurrentTickResponse {
  tick: number;
  dateTime: Date;
}


export interface Transaction {
  id: string;
  sourceId: string;
  destId: string;
  amount: number;
  status: string;
  created: Date;
  stored?: Date;
  staged?: Date;
  broadcasted?: Date;
  confirmed?: Date;
  statusUpdate?: Date;
  targetTick: number;
  isPending: boolean;
  price?: number; // ipo bids
  quantity?: number; // ipo bids
  moneyFlow: boolean;
  type: number;
  inputHex?: string; // payload data for parsing asset transfers and other smart contract calls
}



export interface BalanceResponse {
  computorIndex?: number;
  isComputor: boolean;
  publicId: string;
  currentEstimatedAmount: number;
  epochBaseAmount: number;
  epochChanges: number;
  baseDate: Date;
  transactions: Transaction[]
}

export interface NetworkBalance {
  publicId: string;
  amount: number;
  tick: number;
}

export interface MarketInformation {
  supply: number;
  price: number;
  capitalization: number;
  currency: string
}

export interface ContractDto {
  id: string;
  index: number;
  name: string;
  bidOverview: IpoBidOverview;
}

export interface IpoBid {
  publicKey: string;
  computorId: string;
  price: number;
  positionIndex: number;
}

export interface IpoBidOverview {
  index: number;
  tick: number;
  bids: IpoBid[];
}

export interface PeerDto {
  ipAddress: string;
  currentTick: number;
  lastChange: Date;
}
export interface QubicAsset {
  publicId: string;
  contractIndex: number;
  assetName: string;
  contractName: string;
  ownedAmount: number;
  possessedAmount: number;
  tick: number;
  reportingNodes: string[]; // New field to report source node
  issuerIdentity: string;
}

export interface AssetTransfer {
  assetName: string
  units: string
  newOwnerAndPossessor: string
}

export interface SendManyTransfer {
  destId: string
  amount: string
}
