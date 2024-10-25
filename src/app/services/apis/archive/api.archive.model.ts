// https://qubic.github.io/integration/Partners/qubic-rpc-doc.html?urls.primaryName=Qubic%20RPC%20Archive%20Tree

// /v1/epochs/{epoch}/computors
export interface ComputorsResponse {
  computors: {
    epoch: number;
    identities: string[];
    signatureHex: string;
  };
}


// /v1/healthcheck
export interface HealthcheckResponse {
  status: boolean;
}


// /v1/identities/{identity}/transfer-transactions
export interface TransferTransactionsPerTickResponse {
  transferTransactionsPerTick: {
    tickNumber: number;
    identity: string;
    transactions: {
      sourceId: string;
      destId: string;
      amount: string;
      tickNumber: number;
      inputType: number;
      inputSize: number;
      inputHex: string;
      signatureHex: string;
      txId: string;
    }[];
  }[];
}


// /v1/latestTick
export interface LatestTickResponse {
  latestTick: number;
}


// /v1/status
export interface StatusResponse {
  lastProcessedTick: {
    tickNumber: number;
    epoch: number;
  };
  lastProcessedTicksPerEpoch: {
    [key: string]: number; // Flexible properties with numeric values
  };
  skippedTicks: {
    startTick: number;
    endTick: number;
  }[];
  processedTickIntervalsPerEpoch: {
    epoch: number;
    intervals: {
      initialProcessedTick: number;
      lastProcessedTick: number;
    }[];
  }[];
  emptyTicksPerEpoch: {
    [key: string]: number; // Flexible properties with numeric values
  };
}


// /v1/ticks/{tickNumber}/approved-transactions
export interface ApprovedTransactionsResponse {
  approvedTransactions: {
    sourceId: string;
    destId: string;
    amount: string;
    tickNumber: number;
    inputType: number;
    inputSize: number;
    inputHex: string;
    signatureHex: string;
    txId: string;
  }[];
}


// /v1/ticks/{tickNumber}/chain-hash
export interface ChainHashResponse {
  hexDigest: string;
}


// /v1/ticks/{tickNumber}/quorum-tick-data
export interface QuorumTickDataResponse {
  quorumTickData: {
    quorumTickStructure: {
      epoch: number;
      tickNumber: number;
      timestamp: string;
      prevResourceTestingDigestHex: string;
      prevSpectrumDigestHex: string;
      prevUniverseDigestHex: string;
      prevComputerDigestHex: string;
      txDigestHex: string;
    };
    quorumDiffPerComputor: {
      [key: string]: {
        saltedResourceTestingDigestHex: string;
        saltedSpectrumDigestHex: string;
        saltedUniverseDigestHex: string;
        saltedComputerDigestHex: string;
        expectedNextTickTxDigestHex: string;
        signatureHex: string;
      };
    };
  };
}


// /v1/ticks/{tickNumber}/store-hash
export interface StoreHashResponse {
  hexDigest: string;
}


// /v1/ticks/{tickNumber}/tick-data
export interface TickDataResponse {
  tickData: {
    computorIndex: number;
    epoch: number;
    tickNumber: number;
    timestamp: string;
    varStruct: string;
    timeLock: string;
    transactionIds: string[];
    contractFees: string[];
    signatureHex: string;
  };
}


// /v1/ticks/{tickNumber}/transactions
export interface TransactionsResponse {
  transactions: {
    sourceId: string;
    destId: string;
    amount: string;
    tickNumber: number;
    inputType: number;
    inputSize: number;
    inputHex: string;
    signatureHex: string;
    txId: string;
  }[];
}


// /v1/ticks/{tickNumber}/transfer-transactions
export interface TransactionsTransferResponse {
  transactions: {
    sourceId: string;
    destId: string;
    amount: string;
    tickNumber: number;
    inputType: number;
    inputSize: number;
    inputHex: string;
    signatureHex: string;
    txId: string;
  }[];
}


// /v1/transactions/{txId}
export interface TransactionResponse {
  transaction: {
    sourceId: string;
    destId: string;
    amount: string;
    tickNumber: number;
    inputType: number;
    inputSize: number;
    inputHex: string;
    signatureHex: string;
    txId: string;
  };
}


// /v1/tx-status/{txId}
export interface TransactionStatusResponse {
  transactionStatus: {
    txId: string;
    moneyFlew: boolean;
  };
}


// /v2/identities/{identity}/transfers
export interface IdentitiesTransfersResponse {
  transactions: {
    tickNumber: number;
    identity: string;
    transactions: {
      transaction: {
        sourceId: string;
        destId: string;
        amount: string;
        tickNumber: number;
        inputType: number;
        inputSize: number;
        inputHex: string;
        signatureHex: string;
        txId: string;
      };
      timestamp: string;
      moneyFlew: boolean;
    }[];
  }[];
}


// /v2/ticks/{tickNumber}/hash
export interface TickHashResponse {
  hexDigest: string;
}

// /v2/ticks/{tickNumber}/quorum-data
export interface TickQuorumDataResponse {
  quorumTickData: {
    quorumTickStructure: {
      epoch: number;
      tickNumber: number;
      timestamp: string;
      prevResourceTestingDigestHex: string;
      prevSpectrumDigestHex: string;
      prevUniverseDigestHex: string;
      prevComputerDigestHex: string;
      txDigestHex: string;
    };
    quorumDiffPerComputor: {
      [key: string]: {
        saltedResourceTestingDigestHex: string;
        saltedSpectrumDigestHex: string;
        saltedUniverseDigestHex: string;
        saltedComputerDigestHex: string;
        expectedNextTickTxDigestHex: string;
        signatureHex: string;
      };
    };
  };
}


// /v2/ticks/{tickNumber}/store-hash
export interface StoreHashV2Response {
  hexDigest: string;
}


// /v2/ticks/{tickNumber}/transactions
export interface TickTransactionsResponse {
  transactions: {
    transaction: {
      sourceId: string;
      destId: string;
      amount: string;
      tickNumber: number;
      inputType: number;
      inputSize: number;
      inputHex: string;
      signatureHex: string;
      txId: string;
    };
    timestamp: string;
    moneyFlew: boolean;
  }[];
}


// /v2/transactions/{txId}
export interface TransactionV2Response {
  transaction: {
    sourceId: string;
    destId: string;
    amount: string;
    tickNumber: number;
    inputType: number;
    inputSize: number;
    inputHex: string;
    signatureHex: string;
    txId: string;
  };
  timestamp: string;
  moneyFlew: boolean;
}


// /v2/transactions/{txId}/sendmany
export interface TransactionSendmanyResponse {
  transaction: {
    sourceId: string;
    tickNumber: number;
    transfers: {
      destId: string;
      amount: string;
    }[];
    totalAmount: string;
    signatureHex: string;
    txId: string;
  };
  timestamp: string;
  moneyFlew: boolean;
}

