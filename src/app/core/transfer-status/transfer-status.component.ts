import { Component, Input } from '@angular/core';
import { PendingTransaction } from 'src/app/services/pending-transaction.service';
import { QueryTransactionEntry as ArchivedTransaction } from 'src/app/services/apis/query/api.query.model';
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

  // For pending transactions
  @Input()
  transaction?: PendingTransaction;

  // For archived transactions
  @Input()
  archivedTx?: ArchivedTransaction;

  get status(): ComputedTransactionStatus {
    // If archived transaction is provided, use it
    if (this.archivedTx) {
      const { inputType, amount, destId } = this.archivedTx.transaction;
      return computeArchivedTransactionStatus(inputType, amount, this.archivedTx.moneyFlew, destId);
    }

    // Otherwise use the pending transaction object
    if (this.transaction) {
      return computeTransactionStatus(this.transaction.isPending);
    }

    // This should never happen - log error but don't crash
    console.error('tx-status: either transaction or archivedTx input is required');
    return 'trx-pending';
  }

  get statusConfig(): TransactionStatusConfig {
    return getStatusConfig(this.status);
  }
}
