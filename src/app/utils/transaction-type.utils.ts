import { QubicDefinitions } from '@qubic-lib/qubic-ts-library/dist/QubicDefinitions';
import { StaticSmartContract, TransactionInputType } from '../services/apis/static/qubic-static.model';

export const PLACE_BID_LABEL = 'Place Bid';

const isProtocolMessage = (address: string): boolean =>
  address === QubicDefinitions.ARBITRATOR || address === QubicDefinitions.EMPTY_ADDRESS;

export const isSmartContractTx = (destination: string, inputType: number): boolean =>
  !isProtocolMessage(destination) && inputType > 0;

export const getProcedureName = (
  contractAddress: string,
  inputType: number,
  smartContracts?: StaticSmartContract[] | null
): string | undefined => {
  if (!smartContracts) return undefined;
  const contract = smartContracts.find((sc) => sc.address === contractAddress);
  return contract?.procedures.find((proc) => proc.id === inputType)?.name;
};

export const getInputTypeLabel = (
  inputType: number,
  transactionInputTypes?: TransactionInputType[] | null
): string | undefined => {
  if (!transactionInputTypes) return undefined;
  return transactionInputTypes.find((t) => t.id === inputType)?.label;
};

export const getSharesAuctionBidContract = (
  destination: string,
  inputType: number,
  epoch?: number,
  smartContracts?: StaticSmartContract[] | null
): StaticSmartContract | undefined => {
  if (inputType !== 1 || epoch == null || !smartContracts) return undefined;
  const contract = smartContracts.find((sc) => sc.address === destination);
  return contract && epoch === contract.sharesAuctionEpoch ? contract : undefined;
};

export const getTransactionTypeDisplay = (
  destination: string,
  inputType: number,
  smartContracts?: StaticSmartContract[] | null,
  protocolData?: TransactionInputType[] | null,
  epoch?: number
): string => {
  if (getSharesAuctionBidContract(destination, inputType, epoch, smartContracts)) {
    return PLACE_BID_LABEL;
  }
  if (isSmartContractTx(destination, inputType)) {
    return getProcedureName(destination, inputType, smartContracts) || 'SC';
  }
  return getInputTypeLabel(inputType, protocolData) || 'Standard';
};

export const getTransactionTypeDisplayLong = (
  destination: string,
  inputType: number,
  smartContracts?: StaticSmartContract[] | null,
  protocolData?: TransactionInputType[] | null,
  epoch?: number
): string => {
  return `${getTransactionTypeDisplay(destination, inputType, smartContracts, protocolData, epoch)} (${inputType})`;
};
