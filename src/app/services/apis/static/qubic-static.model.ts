/**
 * Models for Qubic Static API
 * Data source: https://static.qubic.org
 */

export interface SmartContractProcedure {
  id: number;
  name: string;
  fee?: number;
}

export interface StaticSmartContract {
  filename: string;
  name: string;
  label: string;
  githubUrl: string;
  contractIndex: number;
  address: string;
  procedures: SmartContractProcedure[];
  website?: string;
  proposalUrl?: string;
}

export interface GetSmartContractsResponse {
  smart_contracts: StaticSmartContract[];
}

export interface Exchange {
  name: string;
  address: string;
}

export interface GetExchangesResponse {
  exchanges: Exchange[];
}

export interface AddressLabel {
  label: string;
  address: string;
}

export interface GetAddressLabelsResponse {
  address_labels: AddressLabel[];
}

export interface Token {
  name: string;
  website: string;
}

export interface GetTokensResponse {
  tokens: Token[];
}

/**
 * Result returned by the address name resolution service
 */
export interface AddressNameResult {
  name: string;
  type: 'account' | 'smart-contract' | 'exchange' | 'token' | 'address-label';
  website?: string;
}
