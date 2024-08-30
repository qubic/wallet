export interface LatestTickResponseArchiver {
  latestTick: number;
}

//** status */


export interface StatusArchiver {
  lastProcessedTick: LastProcessedTick;
  lastProcessedTicksPerEpoch: LastProcessedTicksPerEpoch;
  skippedTicks: SkippedTick[];
  processedTickIntervalsPerEpoch: ProcessedTickInterval[];
}

export interface LastProcessedTick {
  tickNumber: number;
  epoch: number;
}

export interface LastProcessedTicksPerEpoch {
  additionalProp1: number;
  additionalProp2: number;
  additionalProp3: number;
}

export interface SkippedTick {
  startTick: number;
  endTick: number;
}

export interface Interval {
  initialProcessedTick: number;
  lastProcessedTick: number;
}

export interface ProcessedTickInterval {
  epoch: number;
  intervals: Interval[];
}



export interface CurrentBalanceHttpResponse {
  id: string;
  balance: string;
  validForTick: number;
  latestIncomingTransferTick: number;
  latestOutgoingTransferTick: number;
  incomingAmount:  string;
  outgoingAmount:  string;
  numberOfIncomingTransfers:  number;
  numberOfOutgoingTransfers:  number;
}



//*** Transactions */


export interface TranscationsArchiver {
  transactions: TransactionRecord[];
}

export interface TransactionDetails {
  sourceId: string;
  destId: string;
  amount: string;
  tickNumber: number;
  inputType: number;
  inputSize: number;
  inputHex: string;
  signatureHex: string;
  txId: string;
}

export interface Transaction {
  transaction: TransactionDetails;
  timestamp: string;
  moneyFlew: boolean;
}

export interface TransactionRecord {
  tickNumber: number;
  identity: string;
  transactions: Transaction[];
}






//************************************* */

export interface AuthResponseArchiver {
  success?: boolean;
  token?: string | null;
  refreshToken?: string | null;
  privileges?: Array<string> | null;
}


export interface SubmitTransactionResponseArchiver {
  // id: string;
  // dateTime: Date;
}

export interface SubmitTransactionRequestArchiver {
  // SignedTransaction: string
}

export interface TransactionArchiver {
  // id: string;
  // sourceId: string;
  // destId: string;
  // amount: number;
  // status: string;
  // created: Date;
  // stored?: Date;
  // staged?: Date;
  // broadcasted?: Date;
  // confirmed?: Date;
  // statusUpdate?: Date;
  // targetTick: number;
  // isPending: boolean;
  // price?: number; // ipo bids
  // quantity?:number; // ipo bids
  // moneyFlow: boolean;
}

export interface BalanceResponseArchiver {
  // computorIndex?: number;
  // isComputor: boolean;
  // publicId: string;
  // currentEstimatedAmount: number;
  // epochBaseAmount: number;
  // epochChanges: number;
  // baseDate: Date;
  // transactions: Transaction[]
}

export interface NetworkBalanceArchiver {
  //identity: string;
  // publicId: string;
  // amount: number;
  // tick: number;
}


export interface MarketInformationArchiver {
  // supply: number;
  // price: number;
  // capitalization: number;
  // currency: string
}

export interface BallotDtoArchiver {
  // computorIndex?: number;
  // computorId?: string | null;
  // shortCode?: string | null;
  // vote?: number;
}

export interface ProposalDtoArchiver {
  // status: number;
  // url?: string | null;
  // computorIndex?: number;
  // shortCode?: string | null;
  // computorId: string;
  // ballots?: Array<BallotDto> | null;
  // readonly resultSummary?: { [key: string]: Array<BallotDto>; } | null;
  // readonly mostVotes?: number;
  // readonly sumOption1?: number;
  // readonly sumOption2?: number;
  // readonly sumOption3?: number;
  // readonly sumOption4?: number;
  // readonly sumOption5?: number;
  // readonly sumOption6?: number;
  // readonly sumOption7?: number;
  // readonly isPublished: boolean;
  // title?: string | null;
  // description?: string | null;
  // options?: string | null;
  // readonly hasVotes?: boolean;
  // published: Date | null;
  // publishedTick: number | null;
  // tickForPublish: number;
}

export interface ProposalCreateRequestArchiver {
  // computorId: string | null;
  // title: string | null;
  // description: string | null;
  // option1: string | null;
  // option2: string | null;
  // option3?: string | null;
  // option4?: string | null;
  // option5?: string | null;
  // option6?: string | null;
  // option7?: string | null;
}
export interface ProposalCreateResponseArchiver {
  // url: string;
  // id: string;
  // computorIndex: number;
  // currentProtocol: number;
}

export interface ContractDtoArchiver {
  // id: string;
  // index: number;
  // name: string;
  // bidOverview: IpoBidOverview;
}

export interface IpoBidArchiver {
  // publicKey: string;
  // computorId: string;
  // price: number;
  // positionIndex: number;
}

export interface IpoBidOverviewArchiver {
  // index: number;
  // tick: number;
  // bids: IpoBid[];
}

export interface PeerDtoArchiver {
  // ipAddress: string;
  // currentTick: number;
  // lastChange: Date;
}

export interface QubicAssetArchiver {
  // publicId: string;
  // contractIndex: number;
  // assetName: string;
  // contractName: string;
  // ownedAmount: number;
  // possessedAmount: number;
  // tick: number;
  // reportingNodes: string[]; // New field to report source node
  // issuerIdentity: string;
}

