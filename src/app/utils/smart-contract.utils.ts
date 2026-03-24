import { SmartContractProcedure, StaticSmartContract } from '../services/apis/static/qubic-static.model';
import {
  TRANSFER_SHARE_MANAGEMENT_RIGHTS_IDENTIFIER,
  REVOKE_ASSET_MANAGEMENT_RIGHTS_IDENTIFIER,
} from '../constants/qubic.constants';

/**
 * Find a procedure that has a TransferShareManagementRights sourceIdentifier.
 */
export function findTransferRightsProcedure(contract: StaticSmartContract): SmartContractProcedure | null {
  return contract.procedures?.find(p =>
    p.sourceIdentifier?.toLowerCase() === TRANSFER_SHARE_MANAGEMENT_RIGHTS_IDENTIFIER.toLowerCase()
  ) ?? null;
}

/**
 * Find a procedure that has a RevokeAssetManagementRights sourceIdentifier.
 */
export function findRevokeRightsProcedure(contract: StaticSmartContract): SmartContractProcedure | null {
  return contract.procedures?.find(p =>
    p.sourceIdentifier?.toLowerCase() === REVOKE_ASSET_MANAGEMENT_RIGHTS_IDENTIFIER.toLowerCase()
  ) ?? null;
}

/**
 * Find any management rights procedure (transfer or revoke) on a contract.
 * Returns the procedure and its type.
 */
export function findManagementRightsProcedure(contract: StaticSmartContract): { procedure: SmartContractProcedure; type: 'transfer' | 'revoke' } | null {
  const transferProc = findTransferRightsProcedure(contract);
  if (transferProc) {
    return { procedure: transferProc, type: 'transfer' };
  }
  const revokeProc = findRevokeRightsProcedure(contract);
  if (revokeProc) {
    return { procedure: revokeProc, type: 'revoke' };
  }
  return null;
}

/**
 * Check if a smart contract has a management rights procedure (TransferShareManagementRights or RevokeAssetManagementRights).
 */
export function hasManagementRightsProcedure(contract: StaticSmartContract): boolean {
  return !!findManagementRightsProcedure(contract);
}

/**
 * Check if a smart contract can receive transfer rights (used as destination).
 */
export function canReceiveTransferRights(contract: StaticSmartContract): boolean {
  return !!contract.allowTransferShares;
}
