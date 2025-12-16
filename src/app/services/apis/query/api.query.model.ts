// Request types

export interface GetTransactionByHashRequest {
    hash: string;
}

export interface GetTransactionsForTickRequest {
    tickNumber: number;
}

export interface GetTransactionsForIdentityRequest {
    identity: string;
    filters?: TransactionFilters;
    ranges?: TransactionRanges;
    pagination?: Pagination;
}

export interface TransactionFilters {
    // Add specific filters as needed
}

export interface TransactionRanges {
    tickNumber?: RangeFilter;
    amount?: RangeFilter;
}

export interface RangeFilter {
    gte?: string;
    lte?: string;
    gt?: string;
    lt?: string;
}

export interface Pagination {
    offset?: number;
    size?: number;
}

export interface GetTickDataRequest {
    tickNumber: number;
}

export interface GetComputorListsForEpochRequest {
    epoch: number;
}

// Response types

export interface LastProcessedTickResponse {
    tickNumber: number;
    epoch: number;
    intervalInitialTick: number;
}

// Response is an array directly
export type ProcessedTickIntervalsResponse = EpochTickInterval[];

export interface EpochTickInterval {
    epoch: number;
    firstTick: number;
    lastTick: number;
}

export interface TransactionByHashResponse {
    transaction: QueryTransaction;
}

export interface TransactionsForTickResponse {
    transactions: QueryTransaction[];
}

export interface TransactionsForIdentityResponse {
    validForTick: number;
    hits: HitsInfo;
    transactions: QueryTransaction[];
}

export interface HitsInfo {
    total: number;
    from: number;
    size: number;
}

export interface QueryTransaction {
    hash: string;
    source: string;
    destination: string;
    amount: string;
    tickNumber: number;
    timestamp: string;
    inputType: number;
    inputSize: number;
    inputData?: string;
    signature?: string;
    moneyFlew: boolean;
}

export interface TickDataResponse {
    tickData: TickData;
}

export interface TickData {
    computorIndex: number;
    epoch: number;
    tickNumber: number;
    timestamp: string;
    varStruct?: string;
    timeLock?: string;
    transactionIds?: string[];
    contractFees?: number[];
    signatureHex?: string;
}

export interface ComputorListsForEpochResponse {
    computors: ComputorList;
}

export interface ComputorList {
    epoch: number;
    identities: string[];
    signatureHex?: string;
}

// UI-facing types for displaying transaction data

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

export interface ArchiverTransaction {
    transaction: TransactionDetails;
    timestamp: string;
    moneyFlew: boolean;
}

export interface TransactionRecord {
    tickNumber: number;
    identity: string;
    transactions: ArchiverTransaction[];
}
