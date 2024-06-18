export interface AuthResponseArchive {
    success?: boolean;
    token?: string | null;
    refreshToken?: string | null;
    privileges?: Array<string> | null;
  }
  
  export interface CurrentTickResponseArchive {
    // tick: number;
    // dateTime: Date;
  }  
  
  export interface SubmitTransactionResponseArchive {
    // id: string;
    // dateTime: Date;
  }
  
  export interface SubmitTransactionRequestArchive {
    // SignedTransaction: string
  }
  
  export interface TransactionArchive {
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
  
  export interface BalanceResponseArchive {
    // computorIndex?: number;
    // isComputor: boolean;
    // publicId: string;
    // currentEstimatedAmount: number;
    // epochBaseAmount: number;
    // epochChanges: number;
    // baseDate: Date;
    // transactions: Transaction[]
  }
  
  export interface NetworkBalanceArchive {
    // publicId: string;
    // amount: number;
    // tick: number;
  }
  
  export interface MarketInformationArchive {
    // supply: number;
    // price: number;
    // capitalization: number;
    // currency: string
  }
  
  export interface BallotDtoArchive {
    // computorIndex?: number;
    // computorId?: string | null;
    // shortCode?: string | null;
    // vote?: number;
  }
  
  export interface ProposalDtoArchive {
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
  
  export interface ProposalCreateRequestArchive {
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
  export interface ProposalCreateResponseArchive {
    // url: string;
    // id: string;
    // computorIndex: number;
    // currentProtocol: number;
  }
  
  export interface ContractDtoArchive {
    // id: string;
    // index: number;
    // name: string;
    // bidOverview: IpoBidOverview;
  }
  
  export interface IpoBidArchive {
    // publicKey: string;
    // computorId: string;
    // price: number;
    // positionIndex: number;
  }
  
  export interface IpoBidOverviewArchive {
    // index: number;
    // tick: number;
    // bids: IpoBid[];
  }
  
  export interface PeerDtoArchive {
    // ipAddress: string;
    // currentTick: number;
    // lastChange: Date;
  }

  export interface QubicAssetArchive {
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
  
  