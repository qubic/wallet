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




//*** Transactions */


export interface TransactionsArchiver {
  transactions: TransactionRecord[];
  pagination: Pagination;
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

export interface Pagination {
  totalRecords: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  nextPage: number;
  previousPage: number;
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

