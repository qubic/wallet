// https://qubic.github.io/integration/Partners/qubic-rpc-doc.html?urls.primaryName=Qubic%20RPC%20Live%20Tree

// /balances/{id}
export interface BalanceResponse {
    balance: {
        id: string;
        balance: string;
        validForTick: number;
        latestIncomingTransferTick: number;
        latestOutgoingTransferTick: number;
        incomingAmount: string;
        outgoingAmount: string;
        numberOfIncomingTransfers: number;
        numberOfOutgoingTransfers: number;
    };
}


// /block-height
export interface BlockHeightResponse {
    blockHeight: {
        tick: number;
        duration: number;
        epoch: number;
        initialTick: number;
    };
}


// /broadcast-transaction
export interface BroadcastTransactionResponse {
    peersBroadcasted: number;
    encodedTransaction: string;
    transactionId: string;
}


// /querySmartContract
export interface QuerySmartContractRequest {
    contractIndex: number;
    inputType: number;
    inputSize: number;
    requestData: string;
  }

  export interface QuerySmartContractResponse {
    responseData: string;
  }
  

  // /tick-info
  export interface TickInfoResponse {
    tickInfo: {
      tick: number;
      duration: number;
      epoch: number;
      initialTick: number;
    };
  }


// /live/v1/ipos/active
export interface ActiveIpo {
  contractIndex: number;
  assetName: string;
}

export interface ActiveIposResponse {
  ipos: ActiveIpo[];
}


// /live/v1/ipos/{contractIndex}/bids
export interface IpoBidEntry {
  identity: string;
  amount: string;
}

export interface IpoBidsData {
  contractIndex: number;
  tickNumber: number;
  bids: { [positionIndex: string]: IpoBidEntry };
}

export interface IpoBidsResponse {
  bidData: IpoBidsData;
}

