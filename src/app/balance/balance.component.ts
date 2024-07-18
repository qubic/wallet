import { Component, OnInit, HostListener, AfterViewInit, signal, } from '@angular/core';
import { ApiService } from '../services/api.service';
import { ApiArchiverService } from '../services/api.archiver.service';
import { WalletService } from '../services/wallet.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@ngneat/transloco';
import { BalanceResponse, Transaction } from '../services/api.model';
import { TranscationsArchiver, TransactionRecord } from '../services/api.archiver.model';
import { FormControl } from '@angular/forms';
import { UpdaterService } from '../services/updater-service';
import { Router } from '@angular/router';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';

@Component({
  selector: 'app-balance',
  templateUrl: './balance.component.html',
  styleUrls: ['./balance.component.scss'],
})
export class BalanceComponent implements OnInit, AfterViewInit {

  public accountBalances: BalanceResponse[] = [];
  public seedFilterFormControl: FormControl = new FormControl();
  public currentTick = 0;
  public currentTickArchiver: BehaviorSubject<number> = new BehaviorSubject(0);
  public transactions: Transaction[] = [];
  public isBalanceHidden = false;
  public isShowAllTransactions = true;
  public isOrderByDesc: boolean = true;

  public transactionsArchiver: TranscationsArchiver[] = [];
  public transactionsRecord: TransactionRecord[] = [];
  readonly panelOpenState = signal(false);

  constructor(private router: Router, private transloco: TranslocoService, private api: ApiService, private apiArchiver: ApiArchiverService, private walletService: WalletService, private _snackBar: MatSnackBar, private us: UpdaterService) {
    this.getCurrentTickArchiver();
  }

  ngOnInit(): void {
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
      this.us.internalTransactions.subscribe(txs => {
        this.transactions = txs;
        this.correctTheTransactionListByPublicId();
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

  ngAfterViewInit() {
    this.isBalanceHidden = localStorage.getItem("balance-hidden") == '1' ? true : false;
    if (this.isBalanceHidden) {
      this.balanceHidden();
    }
  }


  toggleShowAllTransactionsView(event: MatSlideToggleChange) {
    this.isShowAllTransactions = !this.isShowAllTransactions;

    if (this.seedFilterFormControl.value) {
      // this.seedFilterFormControl.setValue(null);
    } else {
      const seeds = this.getSeeds();
      if (seeds.length > 0) {
        this.seedFilterFormControl.setValue(seeds[0].publicId);
      }
    }

    if (this.isShowAllTransactions) {
      this.getAllTransactionByPublicId(this.seedFilterFormControl.value);
    }
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
    this.transactionsRecord = [];
    this.transactionsArchiver = [];

    this.apiArchiver.getTransactions(publicId, 0, this.currentTickArchiver.value).subscribe(r => {
      if (r) {
        if (Array.isArray(r)) {
          this.transactionsArchiver.push(...r);
        } else {
          this.transactionsArchiver.push(r);
        }
        this.transactionsRecord.push(...this.transactionsArchiver[0].transactions);
        this.sortTransactions();
      }
    });
  }

  sortTransactions(): void {
    if (this.isOrderByDesc) {
      this.transactionsRecord.sort((a, b) => b.tickNumber - a.tickNumber);
    }
  }


  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent): void {
    this.balanceHidden();
  }

  balanceHidden(): void {
    const disableAreasElements = document.querySelectorAll('.disable-area') as NodeListOf<HTMLElement>;
    disableAreasElements.forEach((area: HTMLElement) => {
      if (area.classList.contains('blurred')) {
        area.classList.remove('blurred');
        this.isBalanceHidden = false;
      } else {
        area.classList.add('blurred');
        this.isBalanceHidden = true;
      }
      localStorage.setItem("balance-hidden", this.isBalanceHidden ? '1' : '0');
    });
  }

  correctTheTransactionListByPublicId(): void {
    const validSeeds = this.getSeeds().map(seed => seed.publicId);
    this.transactions = this.transactions.filter(transaction => {
      return validSeeds.includes(transaction.sourceId) || validSeeds.includes(transaction.destId);
    });
  }

  getDate() {
    return new Date();
  }

  getTotalBalance(estimated = false): number {
    if (estimated)
      return this.walletService.getSeeds().filter((s) => !s.isOnlyWatch).reduce((a, c) => a + Number(c.balance), 0);
    else
      return this.accountBalances.reduce((p, c) => p + (c.epochBaseAmount), 0);
  }

  hasSeeds() {
    return this.walletService.getSeeds().filter((s) => !s.isOnlyWatch).length > 0;
  }

  // onlyUnique(value: Transaction, index:any, array:Transaction[]) {
  //   return array.findIndex((f: Transaction) => f.id === value.id) == index;
  // }

  getTransactions(publicId: string | null = null): Transaction[] {
    return this.transactions.filter(f => publicId == null || f.sourceId == publicId || f.destId == publicId);
    // return this.accountBalances.flatMap((b) => b.transactions.filter(f => publicId == null || f.sourceId == publicId || f.destId == publicId))
    //   .filter(this.onlyUnique)
    //   .sort((a,b) =>  { return (<any>new Date(b.created)) - (<any>new Date(a.created))});
  }

  isOwnId(publicId: string): boolean {
    return this.walletService.getSeed(publicId) !== undefined;
  }

  getSeedName(publicId: string): string {
    var seed = this.walletService.getSeed(publicId);
    if (seed !== undefined)
      return '- ' + seed.alias;
    else
      return '';
  }

  getSeeds() {
    return this.walletService.getSeeds().filter((s) => !s.isOnlyWatch);
  }

  repeat(transaction: Transaction) {
    this.router.navigate(['payment'], {
      state: {
        template: transaction
      }
    });
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




    if (this.isShowAllTransactions) {

      // Header
      const headers = ['Tick', 'Amount', 'Created UTC', 'Transaction ID', 'Source', 'Destination'];
      csvRows.push(headers.join(','));

      // sort targetTick 
      const sortedTransactions = this.transactionsRecord.sort((a, b) => a.tickNumber - b.tickNumber);

      // add row
      sortedTransactions.forEach(transaction => {
        const row = [
          transaction.tickNumber,
          transaction.transactions[0].transaction.amount,
          new Date(Number(transaction.transactions[0].timestamp)),
          transaction.transactions[0].transaction.txId,
          transaction.transactions[0].transaction.sourceId,
          transaction.transactions[0].transaction.destId,
        ];
        csvRows.push(row.join(','));
      });

    } else {

      // Header
      const headers = ['Tick', 'Status', 'Amount', 'Created UTC', 'Transaction ID', 'Source', 'Destination'];
      csvRows.push(headers.join(','));

      // sort targetTick 
      const sortedTransactions = this.getTransactions(this.seedFilterFormControl.value).sort((a, b) => {
        return a.targetTick - b.targetTick;
      });

      // add row
      sortedTransactions.forEach(transaction => {
        const row = [
          transaction.targetTick,
          this.getTransactionStatusLabel(transaction.status),
          transaction.amount,
          transaction.created,
          transaction.id,
          transaction.sourceId,
          transaction.destId,
        ];
        csvRows.push(row.join(','));
      });
    }

    return csvRows.join('\n');
  }


  private getTransactionStatusLabel(status: string): string {
    switch (status) {
      case 'Pending':
      case 'Broadcasted':
        return 'Pending';
      case 'Confirmed':
      case 'Staged':
        return 'Confirmed';
      case 'Success':
        return 'Executed';
      case 'Failed':
        return 'Dismissed';
      case 'Unknown':
        return 'Unknown';
      case 'Created':
        return 'Created';
      default:
        return '';
    }
  }

  private downloadCsv(data: string, filename: string) {
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }




}
