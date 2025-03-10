import { Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { ApiService } from '../services/api.service';
import { ApiArchiverService } from '../services/api.archiver.service';
import { WalletService } from '../services/wallet.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@ngneat/transloco';
import { BalanceResponse, Transaction } from '../services/api.model';
import { TransactionsArchiver, TransactionRecord, TransactionArchiver, StatusArchiver, Pagination } from '../services/api.archiver.model';
import { FormControl } from '@angular/forms';
import { UpdaterService } from '../services/updater-service';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from '../core/confirm-dialog/confirm-dialog.component';

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
  public transactionsNextArchiver: TransactionsArchiver[] = [];
  public transactionsRecord: TransactionRecord[] = [];
  public pagedTransactions: TransactionRecord[] = [];
  readonly panelOpenState = signal(false);
  selectedElement = new FormControl('element1');

  public status!: StatusArchiver;
  public currentSelectedEpoch = 0;
  public initialProcessedTick: number = 0;
  public lastProcessedTick: number = 0;
  public isLoading: boolean = false;

  public pagination: Pagination[] = [];

  @ViewChild('topScrollAnchor') topScroll: ElementRef | undefined;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  pageSize = 50;
  currentPage = 0;


  constructor(
    private router: Router,
    private transloco: TranslocoService,
    private api: ApiService,
    private apiArchiver: ApiArchiverService,
    private walletService: WalletService,
    private _snackBar: MatSnackBar,
    private us: UpdaterService,
    public dialog: MatDialog,
  ) {
    this.getCurrentTickArchiver();
    this.seedFilterFormControl.setValue(null);
  }

  ngOnInit(): void {
    this.isLoading = true;
    this.getStatusArchiver();
    if (!this.walletService.isWalletReady) {
      this.router.navigate(['/public']); // Redirect to public page if not authenticated
    }

    this.seedFilterFormControl.valueChanges.subscribe(value => {
      this.isLoading = true;
      this.getAllTransactionByPublicId(value);
    });

    if (this.hasSeeds()) {
      this.us.currentTick.subscribe(s => {
        this.currentTick = s;
      });

      this.us.loadCurrentBalance(true);

      this.numberLastEpoch = this.walletService.getSettings().numberLastEpoch;

      this.us.internalTransactions.subscribe(txs => {
        this.transactions = txs;
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
      this.selectedElement.setValue('element1');
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
      this.isLoading = false; // Set isLoading to false in case of error
    });
  }

  private clearPaginator() {
    // this.transactionsRecord = [];
    // this.pagedTransactions = [];
    this.pageSize = 50;
    this.currentPage = 0;
  }


  SegmentedControlAction(): void {
    this.isLoading = true; // Set isLoading to true at the beginning
    this.clearPaginator();
    const element = this.selectedElement.value;
    if (element === 'element1') {
      this.isShowAllTransactions = false;
      this.initialProcessedTick = 0;
      this.lastProcessedTick = this.currentTickArchiver.value;
      this.toggleShowAllTransactionsView();
      this.isLoading = false; // Set isLoading to false after the operation
    } else if (element === 'element2') {
      if (!this.seedFilterFormControl.value) {
        const seeds = this.getSeedsWithOnlyWatch();
        if (seeds.length > 0) {
          this.seedFilterFormControl.setValue(seeds[0].publicId);
        }
      }
      this.isShowAllTransactions = true;
      this.getStatusArchiver();
    }
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
    this.updateTransactionsRecord();
  }


  private getCurrentTickArchiver() {
    this.apiArchiver.getCurrentTick().subscribe(latestTick => {
      if (latestTick) {
        this.currentTickArchiver.next(latestTick);
      }
    });
  }


  getAllTransactionByPublicId(publicId: string): void {
    if (!this.isShowAllTransactions) {
      return;
    }

    this.isLoading = true;
    this.transactionsRecord = [];
    this.transactionsArchiver = [];
    this.pagination = [];
    this.apiArchiver.getTransactions(publicId, this.initialProcessedTick, this.lastProcessedTick, 1).subscribe(r => {
      if (r) {
        if (Array.isArray(r)) {
          this.transactionsArchiver.push(...r);
        } else {
          this.transactionsArchiver.push(r);
        }

        this.transactionsRecord.push(...this.transactionsArchiver[0].transactions);
        this.pagination.push(this.transactionsArchiver[0].pagination);

        if (!this.isShowAllTransactions) {
          this.sortTransactions();
        }
        this.clearPaginator();
        this.updatePagedTransactions(); // Ensure the paged transactions are updated
      }
    });
  }


  onPageChange(event: PageEvent) {
    if (this.transactionsRecord.length - 50 < (event.pageIndex * event.pageSize) + 1) {
      this.isLoading = true;
      this.transactionsNextArchiver = [];

      if (this.pagination[0].nextPage >= 1) {
        this.apiArchiver.getTransactions(
          this.seedFilterFormControl.value,
          this.initialProcessedTick,
          this.lastProcessedTick,
          this.pagination[0].nextPage
        ).subscribe(r => {
          if (r) {
            if (Array.isArray(r)) {
              this.transactionsNextArchiver.push(...r);
            } else {
              this.transactionsNextArchiver.push(r);
            }
            this.transactionsRecord.push(...this.transactionsNextArchiver[0].transactions);
            this.pagination = [];
            this.pagination.push(this.transactionsNextArchiver[0].pagination);
          }
          this.isLoading = false;

          this.updatePagedTransactions();
        });
      }
      this.pageSize = event.pageSize;
      this.currentPage = event.pageIndex;
      this.updatePagedTransactions();
    } else {
      // Falls keine neuen Daten geladen werden müssen, sofort aktualisieren
      this.pageSize = event.pageSize;
      this.currentPage = event.pageIndex;
      this.updatePagedTransactions();
    }
    this.gotoTop();
  }


  gotoTop() {
    if (this.topScroll) {
      this.topScroll.nativeElement.scrollIntoView({ behavior: 'smooth' });
    }
  }


  updatePagedTransactions() {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.pagedTransactions = this.transactionsRecord.slice(startIndex, endIndex);
    this.isLoading = false; // Set isLoading to false in case of error
  }


  private updateTransactionsRecord(): void {
    if (!this.isShowAllTransactions) {
      this.pagination = [];
      this.transactionsRecord = [];

      this.transactionsArchiverSubscribe.forEach(archiver => {
        if (archiver.transactions && archiver.transactions.length > 0) {
          this.transactionsRecord.push(...archiver.transactions);
        }
      });

      this.pagination.push({
        totalRecords: this.transactionsRecord.length,
        currentPage: 1,
        totalPages: 1,
        pageSize: this.transactionsRecord.length,
        nextPage: 0,
        previousPage: 0
      });

      // Filter to keep only unique transactions based on txId
      const uniqueTransactions = this.transactionsRecord.filter((transactionRecord, index, self) =>
        index === self.findIndex((t) => (
          t.transactions[0].transaction.txId === transactionRecord.transactions[0].transaction.txId
        ))
      );

      this.transactionsRecord = uniqueTransactions;
      if (!this.isShowAllTransactions) {
        this.sortTransactions();
      }
      this.updatePagedTransactions(); // Ensure the paged transactions are updated
      this.isLoading = false;
    }
    this.isLoading = false;
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
    return this.transactions.filter(f => (publicId == null || f.sourceId == publicId || f.destId == publicId) && f.status != 'Success');
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

  delete(transaction: Transaction) {
    const confirmDialo = this.dialog.open(ConfirmDialog, { restoreFocus: false });
    confirmDialo.afterClosed().subscribe(result => {
      if (result) {
        this.us.removeTransaction(transaction);
      }
    })
  }

  repeatTransactionArchiver(transaction: TransactionArchiver) {
    this.router.navigate(['payment'], {
      state: {
        template: transaction
      }
    });
  }

}
