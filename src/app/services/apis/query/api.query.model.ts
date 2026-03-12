// GET /query/v1/getLastProcessedTick
export interface LastProcessedTickResponse {
  tickNumber: number;
  epoch: number;
  intervalInitialTick: number;
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
