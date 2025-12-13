import { Component, Input } from '@angular/core';
import { Transaction } from 'src/app/services/api.model';
import { Transaction as ArchivedTransaction } from 'src/app/services/api.archiver.model';
import {
  ComputedTransactionStatus,
  TransactionStatusConfig,
  computeTransactionStatus,
  computeArchivedTransactionStatus,
  getStatusConfig
} from 'src/app/helpers/transaction-status.helper';

@Component({
  selector: 'tx-status',
  templateUrl: './transfer-status.component.html',
  styleUrls: ['./transfer-status.component.scss']
})
export class TransferStatusComponent {

  // For regular (qli) transactions
  @Input()
  transaction?: Transaction;

  @Input()
  lastArchivedTick?: number;

  // For archived transactions
  @Input()
  archivedTx?: ArchivedTransaction;

  get status(): ComputedTransactionStatus {
    // If archived transaction is provided, use it
    if (this.archivedTx) {
      const { inputType, amount } = this.archivedTx.transaction;
      return computeArchivedTransactionStatus(inputType, amount, this.archivedTx.moneyFlew);
    }

    // Otherwise use the regular transaction object (qli - only pending/not-executed)
    if (this.transaction) {
      const { status, targetTick } = this.transaction;
      return computeTransactionStatus(status, targetTick, this.lastArchivedTick);
    }

    // This should never happen - log error but don't crash
    console.error('tx-status: either transaction or archivedTx input is required');
    return 'trx-pending';
  }

  get statusConfig(): TransactionStatusConfig {
    return getStatusConfig(this.status);
  }
}
