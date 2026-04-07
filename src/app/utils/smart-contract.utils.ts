import { SmartContractProcedure, StaticSmartContract } from '../services/apis/static/qubic-static.model';
import { TRANSFER_SHARE_MANAGEMENT_RIGHTS_PROCEDURE } from '../constants/qubic.constants';

/**
 * Find the Transfer Share Management Rights procedure in a contract.
 * Case-insensitive match to handle potential casing inconsistencies from the backend.
 */
export function findTransferRightsProcedure(contract: StaticSmartContract): SmartContractProcedure | null {
  return contract.procedures.find(p =>
    p.name.toLowerCase() === TRANSFER_SHARE_MANAGEMENT_RIGHTS_PROCEDURE.toLowerCase()
  ) ?? null;
}

/**
 * Check if a smart contract can send transfer rights (used as source).
 */
export function canSendTransferRights(contract: StaticSmartContract): boolean {
  return !!findTransferRightsProcedure(contract);
}

/**
 * Check if a smart contract can receive transfer rights (used as destination).
 */
export function canReceiveTransferRights(contract: StaticSmartContract): boolean {
  return !!contract.allowTransferShares;
}
