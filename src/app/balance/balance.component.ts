import { Component, OnInit, signal } from '@angular/core';
import { ApiService } from '../services/api.service';
import { ApiArchiverService } from '../services/api.archiver.service';
import { WalletService } from '../services/wallet.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@ngneat/transloco';
import { BalanceResponse, fixTransactionDates, Transaction } from '../services/api.model';
import { TransactionsArchiver, TransactionRecord, TransactionArchiver, StatusArchiver } from '../services/api.archiver.model';
import { FormControl } from '@angular/forms';
import { UpdaterService } from '../services/updater-service';
import { Router } from '@angular/router';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { QubicTransferAssetPayload } from '@qubic-lib/qubic-ts-library/dist/qubic-types/transacion-payloads/QubicTransferAssetPayload'
import { AssetTransfer } from '../services/api.model';

@Component({
  selector: 'app-balance',
  templateUrl: './balance.component.html',
  styleUrls: ['./balance.component.scss'],
})
export class BalanceComponent implements OnInit {

  public accountBalances: BalanceResponse[] = [];
  public seedFilterFormControl: FormControl = new FormControl('');
  public currentTick = 0;
  public numberLastEpoch = 0;
  public currentTickArchiver: BehaviorSubject<number> = new BehaviorSubject(0);
  public transactions: Transaction[] = [];
  public isShowAllTransactions = false;
  public isOrderByDesc: boolean = true;

  public transactionsArchiverSubscribe: TransactionsArchiver[] = [];
  public transactionsArchiver: TransactionsArchiver[] = [];
  public transactionsRecord: TransactionRecord[] = [];
  readonly panelOpenState = signal(false);
  selectedElement = new FormControl('element1');

  public status!: StatusArchiver;
  public currentSelectedEpoch = 0;
  public initialProcessedTick: number = 0;
  public lastProcessedTick: number = 0;
  public assetTransferData: { [key: string]: AssetTransfer } = {};


  constructor(private router: Router, private transloco: TranslocoService, private api: ApiService, private apiArchiver: ApiArchiverService, private walletService: WalletService, private _snackBar: MatSnackBar, private us: UpdaterService) {
    this.getCurrentTickArchiver();
    this.seedFilterFormControl.setValue(null);
  }

  ngOnInit(): void {
    this.getStatusArchiver();
    if (!this.walletService.isWalletReady) {
      this.router.navigate(['/public']); // Redirect to public page if not authenticated
    }

    this.seedFilterFormControl.valueChanges.subscribe(value => {
      this.getAllTransactionByPublicId(value);
    });

    if (this.hasSeeds()) {
      this.us.currentTick.subscribe(s => {
        this.currentTick = s;
      });

      this.numberLastEpoch = this.walletService.getSettings().numberLastEpoch;

      this.us.internalTransactions.subscribe(txs => {
        this.transactions = fixTransactionDates(txs);
        this.correctTheTransactionListByPublicId();
      });

      this.us.transactionsArray.subscribe((transactions: TransactionsArchiver[]) => {
        if (transactions && transactions.length > 0) {
          this.transactionsArchiverSubscribe = transactions;
          this.updateTransactionsRecord();
        }
      });

      this.us.currentBalance.subscribe(response => {
        this.accountBalances = response;
      }, errorResponse => {
        this._snackBar.open(errorResponse.error, this.transloco.translate("general.close"), {
          duration: 0,
          panelClass: "error"
        });
      });
    }
  }


  //**  new Archiver Api */
  private getStatusArchiver() {
    this.apiArchiver.getStatus().subscribe(s => {
      if (s) {
        this.status = s;
        this.currentSelectedEpoch = s.processedTickIntervalsPerEpoch[s.processedTickIntervalsPerEpoch.length - 1].epoch;
        this.GetTransactionsByTick(this.currentSelectedEpoch);
      }
    }, errorResponse => {
      console.log('errorResponse:', errorResponse);
    });
  }


  SegmentedControlAction(): void {
    const element = this.selectedElement.value;
    if (element === 'element1') {
      this.isShowAllTransactions = false;
      this.initialProcessedTick = 0;
      this.lastProcessedTick = this.currentTickArchiver.value
    } else if (element === 'element2') {
      this.isShowAllTransactions = true;
    }
    this.toggleShowAllTransactionsView();
  }


  GetTransactionsByTick(epoch: number): void {
    this.status.processedTickIntervalsPerEpoch
      .filter(t => t.epoch === epoch)
      .forEach(e => {
        this.initialProcessedTick = e.intervals[0].initialProcessedTick;
        this.lastProcessedTick = e.intervals[0].lastProcessedTick;
        this.currentSelectedEpoch = e.epoch;
      });
    this.getAllTransactionByPublicId(this.seedFilterFormControl.value);
  }


  toggleShowAllTransactionsView() {
    this.updateTransactionsRecord();

    if (!this.isShowAllTransactions) {
      this.seedFilterFormControl.setValue(null);
    } else {
      if (!this.seedFilterFormControl.value) {
        const seeds = this.getSeedsWithOnlyWatch();
        if (seeds.length > 0) {
          this.seedFilterFormControl.setValue(seeds[0].publicId);
        }
      }
      this.getAllTransactionByPublicId(this.seedFilterFormControl.value);
    }
  }


  private getCurrentTickArchiver() {
    this.apiArchiver.getLatestTick().subscribe(latestTick => {
      if (latestTick) {
        this.currentTickArchiver.next(latestTick);
      }
    });
  }


  getAllTransactionByPublicId(publicId: string): void {
    if (!this.isShowAllTransactions) {
      return;
    }

    this.transactionsRecord = [];
    this.transactionsArchiver = [];
    this.apiArchiver.getTransactions(publicId, this.initialProcessedTick, this.lastProcessedTick).subscribe(async r => {
      if (r) {
        if (Array.isArray(r)) {
          this.transactionsArchiver.push(...r);
        } else {
          this.transactionsArchiver.push(r);
        }

        if (this.transactionsRecord.length <= 0) {
          this.transactionsRecord.push(...this.transactionsArchiver[0].transactions);
        }

        await Promise.all(this.transactionsRecord.map(transaction =>
          this.checkAndParseAssetTransfer(transaction)
        ));

        this.sortTransactions();
      }
    });
  }

  isQxTransferShares(destId: string, inputType: number): boolean {
    const qxAddress = 'BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARMID';
    const transferAssetInputType = 2;
    return destId == qxAddress && inputType == transferAssetInputType;
  }

  getAssetsTransfers = async (data: string): Promise<AssetTransfer | null> => {
    const decoder = new TextDecoder()
    const binaryData = new Uint8Array(data.match(/.{1,2}/g)?.map((pair) => parseInt(pair, 16)) ?? [])

    const parsedPayload = await new QubicTransferAssetPayload().parse(binaryData)

    if (!parsedPayload) {
      return null
    }

    const assetName = decoder.decode(parsedPayload.getAssetName()).replace(/\0/g, '')
    const units = parsedPayload.getNumberOfUnits().getNumber().toString()
    const newOwnerAndPossessor = parsedPayload.getNewOwnerAndPossessor().getIdentityAsSring() ?? ''

    return {
      assetName,
      units,
      newOwnerAndPossessor
    }
  }

  async checkAndParseAssetTransfer(transaction: any): Promise<void> {
    const txId = transaction.transactions[0].transaction.txId;

    if (this.isQxTransferShares(
      transaction.transactions[0].transaction.destId,
      transaction.transactions[0].transaction.inputType
    )) {
      try {
        const assetData = await this.getAssetsTransfers(transaction.transactions[0].transaction.inputHex);
        if (assetData) {
          this.assetTransferData[txId] = assetData;
        }
      } catch (error) {
        console.error('Error parsing asset transfer:', error);
      }
    }
  }

  getAssetTransfer(txId: string): AssetTransfer | null {
    return this.assetTransferData[txId] || null;
  }

  private updateTransactionsRecord(): void {
    if (!this.isShowAllTransactions) {
      this.transactionsRecord = [];
      this.transactionsArchiverSubscribe.forEach(archiver => {
        if (archiver.transactions && archiver.transactions.length > 0) {
          this.transactionsRecord.push(...archiver.transactions);
        }
      });

      // Filter to keep only unique transactions based on txId
      const uniqueTransactions = this.transactionsRecord.filter((transactionRecord, index, self) =>
        index === self.findIndex((t) => (
          t.transactions[0].transaction.txId === transactionRecord.transactions[0].transaction.txId
        ))
      );

      this.transactionsRecord = uniqueTransactions;
      this.sortTransactions();
    }
  }


  sortTransactions(): void {
    if (this.isOrderByDesc) {
      this.transactionsRecord.sort((a, b) => b.tickNumber - a.tickNumber);
    }
  }


  correctTheTransactionListByPublicId(): void {
    const validSeeds = this.getSeeds().map(seed => seed.publicId);
    this.transactions = this.transactions.filter(transaction => {
      return validSeeds.includes(transaction.sourceId) || validSeeds.includes(transaction.destId);
    });
  }


  hasSeeds() {
    return this.walletService.getSeeds().filter((s) => !s.isOnlyWatch).length > 0;
  }


  getTransactions(publicId: string | null = null): Transaction[] {
    return this.transactions.filter(transaction => {
      // check publicId and status
      const matchesPublicId = publicId == null || transaction.sourceId === publicId || transaction.destId === publicId;
      const isNotSuccess = transaction.status !== 'Success';

      if (!matchesPublicId || !isNotSuccess) return false;

      // get the tick and txId to compare
      const txId = transaction.id;
      const tick = transaction.targetTick;

      // check if the transaction is already returned by the archiver so it can be excluded
      const shouldBeExcluded = this.transactionsRecord.some(ref =>
        ref.tickNumber === tick &&
        ref.transactions.some(t => t.transaction.txId === txId)
      );

      return !shouldBeExcluded; // Exclude if matched
    });
  }



  isOwnId(publicId: string): boolean {
    return this.walletService.getSeed(publicId) !== undefined;
  }


  getSeeds() {
    return this.walletService.getSeeds().filter((s) => !s.isOnlyWatch);
  }

  getSeedsWithOnlyWatch() {
    return this.walletService.getSeeds();
  }


  exportTransactionsToCsv() {
    const now = new Date();
    // Create file names with timestamp
    const filenameWithTimestamp = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}-${now.getSeconds().toString().padStart(2, '0')}_transactions.csv`;
    const csvContent = this.generateCsvContent();
    this.downloadCsv(csvContent, filenameWithTimestamp);
  }


  private generateCsvContent(): string {
    const csvRows = [];
    // Header
    const headers = ['Tick', 'Status', 'Amount', 'Created UTC', 'Transaction ID', 'Source', 'Destination'];
    csvRows.push(headers.join(','));

    // sort targetTick 
    const sortedTransactions = this.transactionsRecord.sort((a, b) => a.tickNumber - b.tickNumber);

    // add row
    sortedTransactions.forEach(transaction => {
      const row = [
        transaction.tickNumber,
        transaction.transactions[0].moneyFlew,
        transaction.transactions[0].transaction.amount,
        new Date(Number(transaction.transactions[0].timestamp)),
        transaction.transactions[0].transaction.txId,
        transaction.transactions[0].transaction.sourceId,
        transaction.transactions[0].transaction.destId,
      ];
      csvRows.push(row.join(','));
    });
    return csvRows.join('\n');
  }


  private downloadCsv(data: string, filename: string) {
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    this.sortTransactions();
    window.URL.revokeObjectURL(url);
  }


  displayPublicId(input: string): string {
    if (input.length <= 10) {
      return input;
    }

    const start = input.slice(0, 5);
    const end = input.slice(-5);

    return `${start}...${end}`;
  }


  repeat(transaction: Transaction) {
    this.router.navigate(['payment'], {
      state: {
        template: transaction
      }
    });
  }

  repeatTransactionArchiver(transaction: TransactionArchiver) {
    this.router.navigate(['payment'], {
      state: {
        template: transaction
      }
    });
  }

  formatInputType(inputType: number, destination: string) {
    const emptyAddress = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFXIB';

    if (inputType === 0 || destination === emptyAddress) {
      return `${inputType} Standard`;
    } else {
      return `${inputType} SC`;
    }
  }

}
