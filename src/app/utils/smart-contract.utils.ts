import { SmartContractProcedure, StaticSmartContract } from '../services/apis/static/qubic-static.model';
import {
  TRANSFER_RIGHTS_IDENTIFIERS,
  REVOKE_RIGHTS_IDENTIFIERS,
} from '../constants/qubic.constants';

/**
 * Match a procedure's sourceIdentifier against a list of known identifiers (case-insensitive).
 */
function matchesIdentifier(sourceIdentifier: string | undefined, identifiers: readonly string[]): boolean {
  if (!sourceIdentifier) return false;
  const id = sourceIdentifier.toLowerCase();
  return identifiers.some(known => known.toLowerCase() === id);
}

/**
 * Find a procedure that matches any known Transfer Share Management Rights identifier.
 */
export function findTransferRightsProcedure(contract: StaticSmartContract): SmartContractProcedure | null {
  return contract.procedures?.find(p => matchesIdentifier(p.sourceIdentifier, TRANSFER_RIGHTS_IDENTIFIERS)) ?? null;
}

/**
 * Find a procedure that matches any known Revoke Asset Management Rights identifier.
 */
export function findRevokeRightsProcedure(contract: StaticSmartContract): SmartContractProcedure | null {
  return contract.procedures?.find(p => matchesIdentifier(p.sourceIdentifier, REVOKE_RIGHTS_IDENTIFIERS)) ?? null;
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
 * Check if a smart contract has any management rights procedure
 * (TransferShare(s)ManagementRights or RevokeAssetManagementRights).
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
