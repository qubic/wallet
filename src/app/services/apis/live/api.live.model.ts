// https://qubic.github.io/integration/Partners/qubic-rpc-doc.html?urls.primaryName=Qubic%20RPC%20Live%20Tree

// /assets/{identity}/issued
export interface AssetsIssuedResponse {
    issuedAssets: {
        data: {
            issuerIdentity: string;
            type: number;
            name: string;
            numberOfDecimalPlaces: number;
            unitOfMeasurement: number[];
        };
        info: {
            tick: number;
            universeIndex: number;
        };
    }[];
}


// /assets/{identity}/owned
export interface AssetsOwnedResponse {
    ownedAssets: {
        data: {
            ownerIdentity: string;
            type: number;
            padding: number;
            managingContractIndex: number;
            issuanceIndex: number;
            numberOfUnits: string;
            issuedAsset: {
                issuerIdentity: string;
                type: number;
                name: string;
                numberOfDecimalPlaces: number;
                unitOfMeasurement: number[];
            };
        };
        info: {
            tick: number;
            universeIndex: number;
        };
    }[];
}


// /assets/{identity}/possessed
export interface AssetsPossessedResponse {
    possessedAssets: {
        data: {
            possessorIdentity: string;
            type: number;
            padding: number;
            managingContractIndex: number;
            issuanceIndex: number;
            numberOfUnits: string;
            ownedAsset: {
                ownerIdentity: string;
                type: number;
                padding: number;
                managingContractIndex: number;
                issuanceIndex: number;
                numberOfUnits: string;
                issuedAsset: {
                    issuerIdentity: string;
                    type: number;
                    name: string;
                    numberOfDecimalPlaces: number;
                    unitOfMeasurement: number[];
                };
            };
        };
        info: {
            tick: number;
            universeIndex: number;
        };
    }[];
}


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
  
