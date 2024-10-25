// https://qubic.github.io/integration/Partners/qubic-rpc-doc.html?urls.primaryName=Qubic%20RPC%20TX%20Status%20Tree#/

// /ticks/{tickNumber}/approved-transactions
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

// /tx-status/status
export interface TxStatusStatusResponse {
  lastProcessedTick: {
    tickNumber: number;
    epoch: number;
  };
  lastProcessedTicksPerEpoch: {
    additionalProp1: number;
    additionalProp2: number;
    additionalProp3: number;
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
}

// /tx-status/{txId}
export interface TxStatusResponse {
  transactionStatus: {
    txId: string;
    moneyFlew: boolean;
  };
}

