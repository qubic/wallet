import { Component, OnDestroy, OnInit } from '@angular/core';
import { IpoContractsService } from '../services/ipo-contracts.service';
import { WalletService } from '../services/wallet.service';
import { ContractDto, IpoBid, IpoBidOverview, PendingIpoBid } from '../services/api.model';
import { Router } from '@angular/router';
import { catchError, forkJoin, of, Subject } from 'rxjs';
import { map, switchMap, takeUntil } from 'rxjs/operators';
import { AddressNameService } from '../services/address-name.service';
import { getDisplayName } from '../utils/address.utils';
import { ApiLiveService } from '../services/apis/live/api.live.service';
import { IpoBidsResponse } from '../services/apis/live/api.live.model';
import { CurrentIpoBidsContract } from '../services/apis/aggregation/api.aggregation.model';
import { ApiAggregationService } from '../services/apis/aggregation/api.aggregation.service';
import { ExplorerUrlHelper } from '../services/explorer-url.helper';
import { PendingTransactionService } from '../services/pending-transaction.service';
import { IPO_INPUT_TYPE } from '../constants/qubic.constants';
import { decodeIpoInputHex } from '../utils/ipo-input.utils';
import { mergeIpoBids } from '../utils/ipo-bid-merge.utils';
import { getStatusConfig, TransactionStatusConfig } from '../helpers/transaction-status.helper';

@Component({
  selector: 'app-ipo',
  templateUrl: './ipo.component.html',
  styleUrls: ['./ipo.component.scss']
})
export class IpoComponent implements OnInit, OnDestroy {

  public ExplorerUrlHelper = ExplorerUrlHelper;
  public ipoContracts: ContractDto[] = [];
  public loaded: boolean = false;
  public refreshing: boolean = false;
  public loadError: boolean = false;
  public failedBidContracts = new Set<number>();
  public retryingContracts = new Set<number>();
  public ipoBids: CurrentIpoBidsContract[] = [];
  public pendingIpoBids: Map<number, PendingIpoBid[]> = new Map();
  public ipoBidsLoadError: boolean = false;
  private trackedIpoTxIds = new Set<string>();
  // Bids resolved on-chain but not yet returned by the aggregation API — kept
  // rendered as 'pending' so they don't flicker out. Per-entry retry budget;
  // pruned once confirmed or once the IPO leaves the active list.
  private resolvedAwaitingConfirmation = new Map<string, { bid: PendingIpoBid; attempts: number }>();
  private confirmRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private ipoContractsService: IpoContractsService,
    private apiLiveService: ApiLiveService,
    private apiAggregationService: ApiAggregationService,
    private walletService: WalletService,
    private addressNameService: AddressNameService,
    private pendingTxService: PendingTransactionService
  ) { }
  ngOnDestroy(): void {
    if (this.confirmRetryTimer) {
      clearTimeout(this.confirmRetryTimer);
      this.confirmRetryTimer = null;
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {

    if (!this.walletService.isWalletReady) {
      this.router.navigate(['/public']); // Redirect to public page if not authenticated
    }

    this.init();

    this.pendingTxService.pendingTransactions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(pending => {
        const map = new Map<number, PendingIpoBid[]>();
        const currentIpoTxIds = new Set<string>();
        for (const tx of pending) {
          if (tx.inputType !== IPO_INPUT_TYPE) continue;
          if (!tx.inputHex) continue;
          const contractIndex = Number(tx.destId);
          if (!Number.isFinite(contractIndex)) continue;
          currentIpoTxIds.add(tx.txId);
          const decoded = decodeIpoInputHex(tx.inputHex);
          if (!decoded) {
            console.warn('Skipping pending IPO bid with undecodable input:', tx.txId);
            continue;
          }
          const bid: PendingIpoBid = {
            status: tx.isPending ? 'pending' : 'failed',
            txId: tx.txId,
            contractIndex,
            source: tx.sourceId,
            bid: decoded,
            tickNumber: tx.tickNumber,
            timestamp: String(tx.created.getTime()),
          };
          const list = map.get(contractIndex) ?? [];
          list.push(bid);
          map.set(contractIndex, list);
        }
        // A tracked IPO tx gone from pending storage was confirmed on-chain
        // (resolver deletes successes; failures stay isPending=false). Keep it
        // visible and re-fetch — there is no background poll for IPO bids.
        let resolved = false;
        for (const id of this.trackedIpoTxIds) {
          if (currentIpoTxIds.has(id)) continue;
          resolved = true;
          if (this.resolvedAwaitingConfirmation.has(id)) continue;
          for (const list of this.pendingIpoBids.values()) {
            const bid = list.find(b => b.txId === id);
            if (bid && bid.status === 'pending') {
              this.resolvedAwaitingConfirmation.set(id, { bid, attempts: 0 });
            }
          }
        }
        this.pendingIpoBids = map;
        this.trackedIpoTxIds = currentIpoTxIds;
        if (resolved && !this.refreshing) {
          this.init();
        }
      });
  }

  init() {
    this.refreshing = true;
    this.loadError = false;
    this.ipoBidsLoadError = false;
    this.failedBidContracts.clear();
    this.retryingContracts.clear();

    // Step 1: Get active IPOs, then fetch bids for each in parallel
    this.apiLiveService.getActiveIpos().pipe(
      switchMap(activeIpos => {
        if (activeIpos.length === 0) {
          return of({ activeIpos, bidResponses: [] as IpoBidsResponse[], bids: [] as CurrentIpoBidsContract[] });
        }

        // Fetch bids and user bid transactions in parallel
        const bidRequests = activeIpos.map(ipo =>
          this.apiLiveService.getIpoBids(ipo.contractIndex).pipe(
            catchError(() => {
              this.failedBidContracts.add(ipo.contractIndex);
              return of(null as unknown as IpoBidsResponse);
            })
          )
        );
        return forkJoin({
          bidResponses: forkJoin(bidRequests),
          bids: this.apiAggregationService.getCurrentIpoBids(this.getSeeds().map(m => m.publicId)).pipe(
            catchError(() => {
              this.ipoBidsLoadError = true;
              return of([] as CurrentIpoBidsContract[]);
            })
          ),
        }).pipe(
          map(result => ({ activeIpos, ...result }))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result) => {
        // Map live API responses to existing ContractDto format
        this.ipoContracts = result.activeIpos.map((ipo, i) => {
          const bidResponse = result.bidResponses[i];
          return this.mapToContractDto(ipo.contractIndex, ipo.assetName, bidResponse);
        });
        // Union-merge, not replace: the aggregation API intermittently omits
        // previously-returned transactions (see mergeIpoBids).
        this.ipoBids = mergeIpoBids(this.ipoBids, result.bids);

        // Drop awaiting entries now confirmed, or whose IPO left the active list
        // (their hash can never return, so they'd linger and burn retries).
        const activeIndexes = new Set(result.activeIpos.map(ipo => ipo.contractIndex));
        const confirmedHashes = new Set(this.ipoBids.flatMap(c => c.transactions.map(t => t.hash)));
        for (const [txId, entry] of this.resolvedAwaitingConfirmation) {
          if (confirmedHashes.has(txId) || !activeIndexes.has(entry.bid.contractIndex)) {
            this.resolvedAwaitingConfirmation.delete(txId);
          }
        }
        this.scheduleConfirmRetryIfNeeded();

        // Update BehaviorSubject for PlaceBidComponent
        this.ipoContractsService.set(this.ipoContracts);

        this.loaded = true;
        this.refreshing = false;
      },
      error: () => {
        this.loadError = true;
        this.loaded = true;
        this.refreshing = false;
      }
    });
  }

  /**
   * Background-retry the fetch while a resolved bid is missing from the
   * aggregation response. Per-bid budget (3) so one stuck entry can't starve
   * later ones; the bid stays rendered as 'pending' until observed.
   */
  private scheduleConfirmRetryIfNeeded(): void {
    if (this.confirmRetryTimer || this.resolvedAwaitingConfirmation.size === 0) {
      return;
    }
    const entries = [...this.resolvedAwaitingConfirmation.values()];
    if (!entries.some(e => e.attempts < 3)) {
      return;
    }
    entries.forEach(e => e.attempts++);
    this.confirmRetryTimer = setTimeout(() => {
      this.confirmRetryTimer = null;
      if (!this.refreshing) {
        this.init();
      }
    }, 5000);
  }

  private mapToContractDto(contractIndex: number, assetName: string, bidResponse: IpoBidsResponse): ContractDto {
    const bidsMap = bidResponse?.bidData?.bids || {};
    const ipoBids: IpoBid[] = Object.entries(bidsMap).map(([positionIndex, entry]) => ({
      publicKey: entry.identity,
      computorId: entry.identity,
      price: parseInt(entry.amount, 10) || 0,
      positionIndex: parseInt(positionIndex, 10) || 0
    }));

    return {
      id: String(contractIndex),
      index: contractIndex,
      name: assetName,
      bidOverview: {
        index: contractIndex,
        tick: bidResponse?.bidData?.tickNumber ?? 0,
        bids: ipoBids
      }
    };
  }

  isOwnId(publicId: string): boolean {
    return this.walletService.getSeeds().find(f => f.publicId == publicId) !== undefined;
  }

  getAddressDisplayName(address: string): string {
    if (!address) {
      return '';
    }
    try {
      const addressName = this.addressNameService.getAddressName(address);
      return getDisplayName(address, this.walletService.getSeeds(), addressName);
    } catch (e) {
      return address;
    }
  }

  getSeeds() {
    return this.walletService.getSeeds();
  }

  // any[] = PendingIpoBid | IpoBidTransaction; strict template checking rejects
  // the raw union over the pending/confirmed field differences.
  getContractBids(contractId: number): any[] {
    const confirmed = this.ipoBids.find(c => c.contractIndex === contractId)?.transactions ?? [];
    const confirmedHashes = new Set(confirmed.map(t => t.hash));
    const pending = (this.pendingIpoBids.get(contractId) ?? []).filter(b => !confirmedHashes.has(b.txId));
    const pendingTxIds = new Set(pending.map(b => b.txId));
    const awaiting = [...this.resolvedAwaitingConfirmation.values()]
      .map(e => e.bid)
      .filter(b => b.contractIndex === contractId && !confirmedHashes.has(b.txId) && !pendingTxIds.has(b.txId));
    return [...pending, ...awaiting, ...confirmed];
  }

  /**
   * Maps a bid row (pending/failed PendingIpoBid, or a status-less confirmed
   * IpoBidTransaction) to the shared status config, matching the balance page.
   */
  getBidStatusConfig(transaction: { status?: 'pending' | 'failed' }): TransactionStatusConfig {
    if (transaction.status === 'pending') {
      return getStatusConfig('trx-pending');
    }
    if (transaction.status === 'failed') {
      return getStatusConfig('trx-not-executed');
    }
    return getStatusConfig('trx-executed');
  }

  dismissFailedBid(txId: string): void {
    this.pendingTxService.removeFailedTransaction(txId);
  }

  hasBidError(contractIndex: number): boolean {
    return this.failedBidContracts.has(contractIndex);
  }

  isRetrying(contractIndex: number): boolean {
    return this.retryingContracts.has(contractIndex);
  }

  retryContractBids(contractIndex: number): void {
    if (this.retryingContracts.has(contractIndex)) {
      return;
    }

    const existingContract = this.ipoContracts.find(c => c.index === contractIndex);
    if (!existingContract) {
      return;
    }

    this.retryingContracts.add(contractIndex);

    this.apiLiveService.getIpoBids(contractIndex).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (bidResponse: IpoBidsResponse) => {
        const idx = this.ipoContracts.findIndex(c => c.index === contractIndex);
        if (idx !== -1) {
          this.ipoContracts[idx] = this.mapToContractDto(contractIndex, existingContract.name, bidResponse);
        }

        this.failedBidContracts.delete(contractIndex);
        this.retryingContracts.delete(contractIndex);
        this.ipoContractsService.set(this.ipoContracts);
      },
      error: () => {
        this.retryingContracts.delete(contractIndex);
      }
    });
  }

  openStats(contractId: number) {
    window.open(`https://auctions.qubic.tools/${contractId}`, "_blank");
  }

  getTotalPrice(bids: IpoBid[]) {
    return bids.reduce((p, c) => p += c.price, 0);
  }

  getBidOverview(contractId: number): IpoBidOverview {
    return this.ipoContracts.find(f => f.index == contractId)!.bidOverview;
  }

  getMyShares(contractId: number) {
    var groupedCount = this.groupBy(this.getBidOverview(contractId).bids.filter(f1 => this.getSeeds().find(f => f.publicId == f1.computorId)), p => p.computorId);
    const arr = Array.from(groupedCount, ([key, value]) => ({
      computorId: key,
      bids: value,
    }));
    return arr;
  }

  groupBy(list: any[], keyGetter: (n: any) => any) {
    const map = new Map();
    list.forEach((item) => {
      const key = keyGetter(item);
      const collection = map.get(key);
      if (!collection) {
        map.set(key, [item]);
      } else {
        collection.push(item);
      }
    });
    return map;
  }
}
