import { Component, OnInit, OnDestroy, signal } from '@angular/core';
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
import { BehaviorSubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { QubicTransferAssetPayload } from '@qubic-lib/qubic-ts-library/dist/qubic-types/transacion-payloads/QubicTransferAssetPayload'
import { AssetTransfer } from '../services/api.model';
import { shortenAddress, getDisplayName, getShortDisplayName, getCompactDisplayName, EMPTY_QUBIC_ADDRESS } from '../utils/address.utils';
import { AddressNameService } from '../services/address-name.service';
import { AddressNameResult } from '../services/apis/static/qubic-static.model';
import { ExplorerUrlHelper } from '../services/explorer-url.helper';

@Component({
  selector: 'app-balance',
  templateUrl: './balance.component.html',
  styleUrls: ['./balance.component.scss'],
})
export class BalanceComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  shortenAddress = shortenAddress;
  ExplorerUrlHelper = ExplorerUrlHelper;
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


  constructor(
    private router: Router,
    private transloco: TranslocoService,
    private api: ApiService,
    private apiArchiver: ApiArchiverService,
    private walletService: WalletService,
    private _snackBar: MatSnackBar,
    private us: UpdaterService,
    private addressNameService: AddressNameService
  ) {
    this.getCurrentTickArchiver();
    this.seedFilterFormControl.setValue(null);
  }

  ngOnInit(): void {
    this.getStatusArchiver();
    if (!this.walletService.isWalletReady) {
      this.router.navigate(['/public']); // Redirect to public page if not authenticated
    }

    this.seedFilterFormControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.getAllTransactionByPublicId(value);
      });

    if (this.hasSeeds()) {
      this.us.currentTick
        .pipe(takeUntil(this.destroy$))
        .subscribe(s => {
          this.currentTick = s;
        });

      this.numberLastEpoch = this.walletService.getSettings().numberLastEpoch;

      this.us.internalTransactions
        .pipe(takeUntil(this.destroy$))
        .subscribe(txs => {
          this.transactions = fixTransactionDates(txs);
          this.correctTheTransactionListByPublicId();
        });

      this.us.transactionsArray
        .pipe(takeUntil(this.destroy$))
        .subscribe((transactions: TransactionsArchiver[]) => {
          if (transactions && transactions.length > 0) {
            this.transactionsArchiverSubscribe = transactions;
            this.updateTransactionsRecord();
          }
        });

      this.us.currentBalance
        .pipe(takeUntil(this.destroy$))
        .subscribe(response => {
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
    this.apiArchiver.getStatus()
      .subscribe(s => {
        if (s) {
          this.status = s;
          this.currentSelectedEpoch = s.processedTickIntervalsPerEpoch[s.processedTickIntervalsPerEpoch.length - 1].epoch;
          // Just initialize the tick range, don't fetch transactions yet
          // Transactions will be fetched when user switches to "By Epochs" tab
          this.GetTransactionsByTick(this.currentSelectedEpoch, false);
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
      // Initialize tick range for the current epoch when switching to epochs view
      if (this.currentSelectedEpoch > 0) {
        this.GetTransactionsByTick(this.currentSelectedEpoch, false); // Don't fetch transactions yet
      }
    }
    this.toggleShowAllTransactionsView();
  }


  get firstEpoch(): number | undefined {
    return this.status?.processedTickIntervalsPerEpoch?.[0]?.epoch;
  }

  get lastEpoch(): number | undefined {
    const intervals = this.status?.processedTickIntervalsPerEpoch;
    if (!intervals || intervals.length === 0) return undefined;
    return intervals[intervals.length - 1]?.epoch;
  }

  get canNavigateToPreviousEpoch(): boolean {
    return this.firstEpoch !== undefined && this.firstEpoch < this.currentSelectedEpoch;
  }

  get canNavigateToNextEpoch(): boolean {
    return this.lastEpoch !== undefined && this.lastEpoch > this.currentSelectedEpoch;
  }

  GetTransactionsByTick(epoch: number, fetchTransactions: boolean = true): void {
    this.status.processedTickIntervalsPerEpoch
      .filter(t => t.epoch === epoch)
      .forEach(e => {
        // Only set tick range if intervals exist and have data
        if (e.intervals && e.intervals.length > 0 && e.intervals[0]) {
          this.initialProcessedTick = e.intervals[0].initialProcessedTick;
          this.lastProcessedTick = e.intervals[0].lastProcessedTick;
          this.currentSelectedEpoch = e.epoch;
        }
      });
    // Only fetch transactions if explicitly requested (e.g., when navigating between epochs)
    if (fetchTransactions) {
      this.getAllTransactionByPublicId(this.seedFilterFormControl.value);
    }
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
          // No need to call getAllTransactionByPublicId here - setValue will trigger valueChanges
          return;
        }
      }
      // Only call if we didn't set a new value above (which would trigger valueChanges)
      this.getAllTransactionByPublicId(this.seedFilterFormControl.value);
    }
  }


  private getCurrentTickArchiver() {
    this.apiArchiver.getLatestTick()
      .subscribe(latestTick => {
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
    this.apiArchiver.getTransactions(publicId, this.initialProcessedTick, this.lastProcessedTick)
      .subscribe(async r => {
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

  getSelectedSeed() {
    const publicId = this.seedFilterFormControl.value;
    return this.getSeedsWithOnlyWatch().find(s => s.publicId === publicId);
  }

  /**
   * Returns display name for an address. If the address belongs to wallet,
   * returns the account alias with full address in parentheses. Otherwise returns full address.
   * Uses the reusable utility function from address.utils.ts
   */
  getAddressDisplayName(address: string): string {
    if (!address) {
      return '';
    }
    try {
      const addressName = this.addressNameService.getAddressName(address);
      return getDisplayName(address, this.walletService.getSeeds(), addressName);
    } catch (e) {
      console.error('Error in getAddressDisplayName:', e);
      return address; // Fallback to showing the address
    }
  }

  /**
   * Returns short display name for an address. If the address belongs to wallet,
   * returns the account alias with shortened address in parentheses. Otherwise returns shortened address.
   * Uses the reusable utility function from address.utils.ts
   */
  getAddressShortDisplayName(address: string): string {
    if (!address) {
      return '';
    }
    try {
      const addressName = this.addressNameService.getAddressName(address);
      return getShortDisplayName(address, this.walletService.getSeeds(), addressName);
    } catch (e) {
      console.error('Error in getAddressShortDisplayName:', e);
      return shortenAddress(address); // Fallback to showing the shortened address
    }
  }

  /**
   * Get the address name result for an address
   * Useful for getting both the name and type information
   */
  getAddressNameInfo(address: string): any {
    return this.addressNameService.getAddressName(address);
  }

  /**
   * Returns compact display name for an address - shows ONLY the name for known addresses
   * (wallet accounts, smart contracts, exchanges, tokens) without address in parentheses.
   * For unknown addresses, shows shortened address. Ideal for mobile/compact views.
   */
  getAddressCompactDisplayName(address: string): string {
    if (!address) {
      return '';
    }
    try {
      const addressName = this.addressNameService.getAddressName(address);
      return getCompactDisplayName(address, this.walletService.getSeeds(), addressName);
    } catch (e) {
      console.error('Error in getAddressCompactDisplayName:', e);
      return shortenAddress(address); // Fallback to showing the shortened address
    }
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

  formatInputType(inputType: number, destination: string): string {
    // Check if it's a smart contract transaction (inputType > 0 and not protocol message)
    const isSmartContract = inputType > 0 && destination !== EMPTY_QUBIC_ADDRESS;

    // Base type
    const baseType = inputType.toString();
    const category = isSmartContract ? 'SC' : 'Standard';

    // Try to get smart contract details and procedure name
    if (isSmartContract) {
      const smartContract = this.addressNameService.getSmartContractByAddressSync(destination);
      if (smartContract && smartContract.procedures) {
        const procedure = smartContract.procedures.find((p: any) => p.id === inputType);
        if (procedure) {
          return `${baseType} ${category} (${procedure.name})`;
        }
      }
    }

    // Return without procedure name
    return `${baseType} ${category}`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
