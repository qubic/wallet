import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { NetworkBalance, QubicAsset } from './api.model';
import { ApiQliService } from './apis/qli/api.qli.service';
import { QubicRpcService } from './qubic-rpc.service';
import { QubicRpcError } from '@qubic.org/rpc';
import { WalletService } from './wallet.service';
import { VisibilityService } from './visibility.service';
import { forkJoin, Observable } from 'rxjs';
import { ApiStatsService } from './apis/stats/api.stats.service';
import { LatestStatsResponse } from './apis/stats/api.stats.model';
import { ApiLiveService } from './apis/live/api.live.service';
import { ApiQueryService } from './apis/query/api.query.service';
import { ProcessedTickInterval, QueryTransactionRecord } from './apis/query/api.query.model';
import { PendingTransactionService } from './pending-transaction.service';

@Injectable({
  providedIn: 'root'
})
export class UpdaterService {

  public currentTick: BehaviorSubject<number> = new BehaviorSubject(0);
  public lastProcessedTick: BehaviorSubject<number> = new BehaviorSubject(0);
  public numberLastEpoch = 5;
  public latestStats: BehaviorSubject<LatestStatsResponse> = new BehaviorSubject<LatestStatsResponse>({
    data: {
      price: 0,
      timestamp: '',
      circulatingSupply: '',
      activeAddresses: 0,
      marketCap: '',
      epoch: 0,
      currentTick: 0,
      ticksInCurrentEpoch: 0,
      emptyTicksInCurrentEpoch: 0,
      epochTickQuality: 0,
      burnedQus: ''
    }
  });
  public errorStatus: BehaviorSubject<string> = new BehaviorSubject<string>("");
  private tickLoading = false;
  private tickInfoLoading = false;
  private balanceLoading = false;
  private latestStatsLoading = false;
  private transactionsLoading = false;
  private isActive = true;
  public transactionsArray: BehaviorSubject<QueryTransactionRecord[]> = new BehaviorSubject<QueryTransactionRecord[]>([]);
  public processedTickIntervals: BehaviorSubject<ProcessedTickInterval[]> = new BehaviorSubject<ProcessedTickInterval[]>([]);

  constructor(private visibilityService: VisibilityService, private api: ApiQliService, private qubicRpc: QubicRpcService, private walletService: WalletService, private apiStats: ApiStatsService, private apiLive: ApiLiveService, private apiQuery: ApiQueryService, private pendingTxService: PendingTransactionService) {
    this.init();
  }

  private init(): void {
    this.numberLastEpoch = this.walletService.getSettings().numberLastEpoch;
    this.getProcessedTickIntervals();
    this.getLastProcessedTick();
    this.getTickInfo();
    this.getCurrentBalance();
    this.getAssets();
    this.getLatestStats();
    this.getTransactionsQuery();
    // every 30 seconds
    setInterval(() => {
      this.getProcessedTickIntervals();
      this.getLastProcessedTick();
      this.getTickInfo();
    }, 30000);
    // every minute
    setInterval(async () => {
      try {
        await this.pendingTxService.checkAndResolvePendingTransactions(this.lastProcessedTick.getValue());
      } catch (e) {
        console.error('Failed to resolve pending transactions:', e);
      }
      this.getCurrentBalance();
      this.getAssets();
      this.getTransactionsQuery();
    }, 60000);
    // every hour
    setInterval(() => {
      this.getLatestStats();
    }, 60000 * 60);

    this.visibilityService.isActive().subscribe(s => {
      if (!this.isActive && s) {
        this.isActive = s;
        this.forceUpdateCurrentTick();
      } else {
        this.isActive = s;
      }
    });
  }


  public loadCurrentBalance(force = false) {
    this.getCurrentBalance(force);
  }

  private async getCurrentBalance(force = false, publicIds?: string[], callbackFn?: (balances: NetworkBalance[]) => void): Promise<void> {
    if (!force && (this.balanceLoading || !this.isActive)) return;

    const ids = publicIds ?? this.walletService.getSeeds().map(m => m.publicId);
    if (!ids.length) return;

    this.balanceLoading = true;
    try {
      const balanceMap = await this.qubicRpc.getBalances(ids);
      const results: NetworkBalance[] = ids.map(id => ({
        publicId: id,
        amount: Number(balanceMap.get(id) ?? 0n)
      }));
      results.forEach(e => this.walletService.setBalance(e.publicId, e.amount));
      await this.walletService.savePublic(false);
      if (callbackFn) callbackFn(results);
    } catch (e) {
      if (e instanceof QubicRpcError) {
        this.errorStatus.next(e.message);
      } else {
        console.error('Balance fetch failed:', e);
        this.errorStatus.next('An unexpected error occurred while fetching balances.');
      }
    } finally {
      this.balanceLoading = false;
    }
  }

  public forceLoadAssets(allbackFn: ((assets: QubicAsset[]) => void) | undefined = undefined) {
    this.getAssets(undefined, allbackFn);
  }

  public forceUpdateNetworkBalance(publicId: string, callbackFn?: (balances: NetworkBalance[]) => void): void {
    this.getCurrentBalance(false, [publicId], callbackFn);
  }

  //#region

  //**  Query Api */

  private getProcessedTickIntervals() {
    this.apiQuery.getProcessedTickIntervals().subscribe(intervals => {
      if (intervals) {
        this.processedTickIntervals.next(intervals);
      }
    }, errorResponse => {
      this.logHttpError(errorResponse);
    });
  }


  private getTickInfo() {

    if (this.tickInfoLoading) {
      return;
    }

    this.tickInfoLoading = true;

    this.apiLive.getTickInfo().subscribe(r => {
      if (r && r.tickInfo) {
        this.currentTick.next(r.tickInfo.tick);
      }
      this.tickInfoLoading = false;
    }, errorResponse => {
      this.logHttpError(errorResponse);
      this.tickInfoLoading = false;
    });
  }

  private getLastProcessedTick() {
    if (this.tickLoading)
      return;

    this.tickLoading = true;

    this.apiQuery.getLastProcessedTick().subscribe(response => {
      if (response) {
        this.lastProcessedTick.next(response.tickNumber);
        if (this.transactionsArray.getValue().length <= 0) {
          this.getTransactionsQuery();
        }
      }
      this.tickLoading = false;
    }, errorResponse => {
      this.logHttpError(errorResponse);
      this.tickLoading = false;
    });
  }


  private getTransactionsQuery(publicIds: string[] | undefined = undefined): void {
    this.numberLastEpoch = this.walletService.getSettings().numberLastEpoch;
    const intervals = this.processedTickIntervals.getValue();
    if ((this.transactionsLoading || this.lastProcessedTick.value === 0 || intervals.length === 0))
      return;

    if (!publicIds)
      publicIds = this.walletService.getSeeds().filter((s) => !s.isOnlyWatch).map(m => m.publicId);

    // Find the initial tick based on the configured number of past epochs
    const lastInterval = intervals[intervals.length - 1];
    const targetEpoch = lastInterval.epoch - this.numberLastEpoch;
    let initialTick = lastInterval.firstTick;

    const targetInterval = intervals.find(i => i.epoch === targetEpoch);
    if (targetInterval) {
      initialTick = targetInterval.firstTick;
    }

    this.transactionsLoading = true;

    if (this.walletService.getSeeds().length > 0) {
      const observables: Observable<QueryTransactionRecord[]>[] = publicIds.map(publicId =>
        this.apiQuery.getTransfers(publicId, initialTick, this.lastProcessedTick.value)
      );

      // Combine all observables and collect results
      forkJoin(observables).subscribe(results => {
        // Combine all results into a single array
        const allTransactions = results.flat();

        // Update BehaviorSubject with the combined results
        this.transactionsArray.next(allTransactions);
        this.transactionsLoading = false;
      }, errorResponse => {
        console.error('errorResponse:', errorResponse);
        this.transactionsLoading = false;
      });
    }
  }

  //#endregion
  // todo: put this in a helper class/file
  private groupBy<T>(arr: T[], fn: (item: T) => any) {
    return arr.reduce<Record<string, T[]>>((prev, curr) => {
      const groupKey = fn(curr);
      const group = prev[groupKey] || [];
      group.push(curr);
      return { ...prev, [groupKey]: group };
    }, {});
  }

  /**
 * load assets from API
 * @returns
 */
  private async getAssets(publicIds: string[] | undefined = undefined, callbackFn: ((balances: QubicAsset[]) => void) | undefined = undefined): Promise<void> {
    if (!this.isActive)
      return;

    if (!publicIds)
      // Only fetch assets for non-watch-only seeds since watch-only seeds don't display assets
      publicIds = this.walletService.getSeeds().filter((s) => !s.isOnlyWatch).map(m => m.publicId);

    if (publicIds.length > 0) {
      // todo: Use Websocket!
      this.api.getOwnedAssets(publicIds).subscribe(async (r: QubicAsset[]) => {
        if (r) {
          // update wallet - batch updates without saving
          // Group assets by publicId, including empty arrays for publicIds with no assets
          const groupedAssets = this.groupBy(r, (a: QubicAsset) => a.publicId);

          // Update all seeds atomically - trust the API response
          publicIds!.forEach(publicId => {
            const seed = this.walletService.getSeed(publicId);
            if (seed) {
              const assets = groupedAssets[publicId] || [];

              // Filter out assets with 0 owned amount and 0 possessed amount
              const filteredAssets = assets.filter((asset: any) =>
                (asset.ownedAmount > 0) || (asset.possessedAmount > 0)
              );
              seed.assets = filteredAssets;
            }
          });

          // Save once after ALL mutations are complete
          await this.walletService.savePublic(false);

          if (callbackFn)
            callbackFn(r);
        }
      }, errorResponse => {
        if (errorResponse.status === 401) this.api.reAuthenticate();
        else this.logHttpError(errorResponse);
      });
    }
  }

  private getLatestStats(callbackFn: ((mi: LatestStatsResponse) => void) | undefined = undefined): void {
    if (!this.isActive || this.latestStatsLoading)
      return;

    this.latestStatsLoading = true;

    this.apiStats.getLatestStats().subscribe({
      next: (r: LatestStatsResponse) => {
        if (r) {
          this.latestStats.next(r);

          if (callbackFn) {
            callbackFn(r);
          }
        }
        this.latestStatsLoading = false;
      },
      error: (errorResponse) => {
        this.logHttpError(errorResponse);
        this.latestStatsLoading = false;
      }
    });
  }


  private logHttpError(errObject: any) {
    console.error('HTTP Error:', errObject);
    if (errObject.error && typeof errObject.error === 'string' && errObject.error.indexOf("Amount of Accounts must be between") >= 0) {
      this.errorStatus.next(errObject.error);
    } else {
      this.errorStatus.next("An error occurred while communicating with the server.");
    }
  }

  public forceUpdateCurrentTick() {
    this.getLastProcessedTick();
  }

}
