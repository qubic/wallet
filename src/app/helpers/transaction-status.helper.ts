/**
 * Transaction status helper utilities.
 * Aligns with wallet-app and explorer-frontend logic.
 */

import { QubicDefinitions } from '@qubic-lib/qubic-ts-library/dist/QubicDefinitions';

export type ComputedTransactionStatus = 'trx-pending' | 'transfer-success' | 'transfer-failed' | 'trx-not-executed' | 'trx-executed';

export interface TransactionStatusConfig {
  icon: string;
  colorClass: string;
  tooltipKey: string;
}

const STATUS_CONFIG: Record<ComputedTransactionStatus, TransactionStatusConfig> = {
  'trx-pending': {
    icon: 'schedule',
    colorClass: 'trx-pending',
    tooltipKey: 'balanceComponent.transactions.status.pending.tooltip'
  },
  'transfer-success': {
    icon: 'check_circle',
    colorClass: 'transfer-success',
    tooltipKey: 'balanceComponent.transactions.status.success.tooltip'
  },
  'transfer-failed': {
    icon: 'highlight_off',
    colorClass: 'transfer-failed',
    tooltipKey: 'balanceComponent.transactions.status.failure.tooltip'
  },
  'trx-not-executed': {
    icon: 'highlight_off',
    colorClass: 'trx-not-executed',
    tooltipKey: 'balanceComponent.transactions.status.invalid.tooltip'
  },
  'trx-executed': {
    icon: 'check_circle_outline',
    colorClass: 'trx-executed',
    tooltipKey: 'balanceComponent.transactions.status.executed.tooltip'
  }
};

/**
 * Returns the status configuration (icon, color class, tooltip key) for a given status.
 */
export function getStatusConfig(status: ComputedTransactionStatus): TransactionStatusConfig {
  return STATUS_CONFIG[status];
}

/**
 * Checks if a transaction is a SendMany transaction (QUTIL smart contract).
 */
export function isSendManyTransaction(destId: string | undefined, inputType: number): boolean {
  return destId === QubicDefinitions.QUTIL_ADDRESS && inputType === QubicDefinitions.QUTIL_SENDMANY_INPUT_TYPE;
}

/**
 * Checks if a transaction is a simple transfer (inputType 0 with amount > 0).
 */
export function isSimpleTransfer(inputType: number, amount: number): boolean {
  return inputType === 0 && amount > 0;
}

/**
 * Determines the outcome of a confirmed transaction based on type and money flow.
 * Shared logic between regular and archived transaction status computation.
 */
function determineConfirmedOutcome(
  inputType: number,
  amount: number,
  moneyFlew: boolean,
  destId?: string
): ComputedTransactionStatus {
  const isSendMany = isSendManyTransaction(destId, inputType);

  // Simple transfer or SendMany: show success/failure based on moneyFlew
  if (isSimpleTransfer(inputType, amount) || isSendMany) {
    return moneyFlew ? 'transfer-success' : 'transfer-failed';
  }

  // SC call or 0-amount: always "executed"
  return 'trx-executed';
}

/**
 * Computes the transaction status for qli transactions (non-archived).
 * Only non-Success transactions are shown from qli, so this only returns
 * trx-pending or trx-not-executed.
 *
 * @param status - The raw status string from the API
 * @param targetTick - The tick the transaction targets
 * @param lastArchivedTick - The last tick processed by the archiver
 * @returns The computed status (trx-pending or trx-not-executed)
 */
export function computeTransactionStatus(
  status: string,
  targetTick?: number,
  lastArchivedTick?: number
): ComputedTransactionStatus {
  // Not executed if: tick has passed OR status is Failed
  const tickHasPassed = targetTick !== undefined && lastArchivedTick !== undefined && lastArchivedTick > targetTick;
  if (tickHasPassed || status === 'Failed') {
    return 'trx-not-executed';
  }

  // Otherwise pending
  return 'trx-pending';
}

/**
 * Computes status for archived transactions (from archiver API).
 * Archived transactions are already confirmed, so no pending state.
 *
 * @param inputType - The transaction input type (0 = simple transfer)
 * @param amount - The transaction amount (as string from archiver)
 * @param moneyFlew - Whether the money actually moved
 * @param destId - The destination address (used to identify SendMany transactions)
 * @returns The computed status
 */
export function computeArchivedTransactionStatus(
  inputType: number,
  amount: string | number,
  moneyFlew: boolean,
  destId?: string
): ComputedTransactionStatus {
  const amountNum = typeof amount === 'string' ? parseInt(amount, 10) : amount;
  return determineConfirmedOutcome(inputType, amountNum, moneyFlew, destId);
}
