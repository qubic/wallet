// GET /query/v1/getLastProcessedTick
export interface LastProcessedTickResponse {
  tickNumber: number;
  epoch: number;
  intervalInitialTick: number;
  lastProcessedLogTick: number;
}

// GET /query/v1/getProcessedTickIntervals
export interface ProcessedTickInterval {
  epoch: number;
  firstTick: number;
  lastTick: number;
}

// POST /query/v1/getTransactionByHash
export interface GetTransactionByHashRequest {
  hash: string;
}

export interface QueryTransaction {
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
}

// POST /query/v1/getTransactionsForIdentity
export interface GetTransactionsForIdentityRequest {
  identity: string;
  pagination?: {
    offset?: number;
    size?: number;
  };
  filters?: {
    source?: string;
    destination?: string;
    amount?: string;
    inputType?: string;
    tickNumber?: string;
  };
  ranges?: {
    amount?: { gte?: string; lte?: string };
    tickNumber?: { gte?: string; lte?: string };
    timestamp?: { gte?: string; lte?: string };
  };
}

export interface GetTransactionsForIdentityResponse {
  validForTick: number;
  hits: {
    total: number;
    from: number;
    size: number;
  };
  transactions: QueryTransaction[];
}

/**
 * Legacy-compatible types used by the UI (balance.component, updater-service).
 * The query API returns flat QueryTransaction[], but the UI was built around
 * the archiver's grouped structure. The service layer transforms the flat
 * response into these grouped types for backward compatibility.
 */
export interface QueryTransactionDetails {
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

export interface QueryTransactionEntry {
  transaction: QueryTransactionDetails;
  timestamp: string;
  moneyFlew: boolean;
}

export interface QueryTransactionRecord {
  tickNumber: number;
  identity: string;
  transactions: QueryTransactionEntry[];
}
