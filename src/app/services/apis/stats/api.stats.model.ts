//https://qubic.github.io/integration/Partners/qubic-rpc-doc.html?urls.primaryName=Qubic%20Stats%20API

// /v1/latest-stats
export interface LatestStatsResponse {
  data: {
    timestamp: string;
    circulatingSupply: string;
    activeAddresses: number;
    price: number;
    marketCap: string;
    epoch: number;
    currentTick: number;
    ticksInCurrentEpoch: number;
    emptyTicksInCurrentEpoch: number;
    epochTickQuality: number;
    burnedQus: string;
  };
}

// /v1/rich-list
export interface RichListRespone {
  pagination: {
    totalRecords: number;
    currentPage: number;
    totalPages: number;
  };
  epoch: number;
  richList: {
    entities: {
      identity: string;
      balance: string;
    }[];
  };
}
