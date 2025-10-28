import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { QubicTransaction } from '@qubic-lib/qubic-ts-library/dist/qubic-types/QubicTransaction';
import { BalanceResponse, NetworkBalance, QubicAsset, Transaction } from './api.model';
import { TransactionsArchiver, StatusArchiver } from './api.archiver.model';
import { ApiService } from './api.service';
import { ApiArchiverService } from './api.archiver.service';
import { WalletService } from './wallet.service';
import { VisibilityService } from './visibility.service';
import { forkJoin, Observable } from 'rxjs';
import { ApiStatsService } from './apis/stats/api.stats.service';
import { LatestStatsResponse } from './apis/stats/api.stats.model';
import { ApiLiveService } from './apis/live/api.live.service';

@Injectable({
  providedIn: 'root'
})
export class UpdaterService {

  public currentTick: BehaviorSubject<number> = new BehaviorSubject(0);
  public archiverLatestTick: BehaviorSubject<number> = new BehaviorSubject(0);
  public numberLastEpoch = 5;
  public currentBalance: BehaviorSubject<BalanceResponse[]> = new BehaviorSubject<BalanceResponse[]>([]);
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
  public internalTransactions: BehaviorSubject<Transaction[]> = new BehaviorSubject<Transaction[]>([]); // used to store internal tx
  public errorStatus: BehaviorSubject<string> = new BehaviorSubject<string>("");
  private tickLoading = false;
  private tickInfoLoading = false;
  private balanceLoading = false;
  private latestStatsLoading = false;
  private networkBalanceLoading = false;
  private transactionArchiverLoading = false;
  private isActive = true;
  private lastAssetsLoaded: Date | undefined;
  public transactionsArray: BehaviorSubject<TransactionsArchiver[]> = new BehaviorSubject<TransactionsArchiver[]>([]); // TransactionsArchiver[] = [];
  private status!: StatusArchiver;

  constructor(private visibilityService: VisibilityService, private api: ApiService, private apiArchiver: ApiArchiverService, private walletService: WalletService, private apiStats: ApiStatsService, private apiLive: ApiLiveService) {
    this.init();
  }

  private init(): void {
    this.numberLastEpoch = this.walletService.getSettings().numberLastEpoch;
    this.getStatusArchiver();
    this.getCurrentTickArchiver();
    this.getTickInfo();
    this.getCurrentBalance();
    this.getNetworkBalances();
    this.getAssets();
    this.getLatestStats();
    this.getTransactionsArchiver();
    // every 30 seconds
    setInterval(() => {
      this.getStatusArchiver();
      this.getCurrentTickArchiver();
      this.getTickInfo();
    }, 30000);
    // every minute
    setInterval(() => {
      this.getCurrentBalance();
      this.getNetworkBalances();
      this.getAssets();
      this.getTransactionsArchiver();
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
    this.getNetworkBalances(undefined, undefined, force);
  }


  /**
   * should load the current balances for the accounts
   * @returns 
   */
  private getCurrentBalance(force = false) {
    if (!force && (this.balanceLoading || !this.isActive))
      return;

    this.balanceLoading = true;
    if (this.walletService.getSeeds().length > 0) {
      // todo: Use Websocket!
      this.api.getCurrentBalance(this.walletService.getSeeds().map(m => m.publicId)).subscribe(r => {
        if (r) {
          this.currentBalance.next(r);
          this.addTransactions(r.flatMap((b) => b.transactions).filter(this.onlyUniqueTx).sort((a, b) => { return b.targetTick - a.targetTick }))
        }
        this.balanceLoading = false;
      }, errorResponse => {
        this.processError(errorResponse, false);
        this.balanceLoading = false;
      });
    }
  }

  private onlyUniqueTx(value: Transaction, index: any, array: Transaction[]) {
    return array.findIndex((f: Transaction) => f.id === value.id) == index;
  }

  public forceLoadAssets(allbackFn: ((assets: QubicAsset[]) => void) | undefined = undefined) {
    this.lastAssetsLoaded = undefined;
    this.getAssets(undefined, allbackFn);
  }

  public forceUpdateNetworkBalance(publicId: string, callbackFn: ((balances: NetworkBalance[]) => void) | undefined = undefined): void {
    this.getNetworkBalances([publicId], callbackFn);
  }

  /**
   * load balances directly from network
   * @returns 
   */
  private getNetworkBalances(publicIds: string[] | undefined = undefined, callbackFn: ((balances: NetworkBalance[]) => void) | undefined = undefined, force = false): void {
    if (!force && (this.networkBalanceLoading || !this.isActive))
      return;

    if (!publicIds)
      publicIds = this.walletService.getSeeds().map(m => m.publicId);

    this.networkBalanceLoading = true;
    if (this.walletService.getSeeds().length > 0) {
      // todo: Use Websocket!
      this.api.getNetworkBalances(publicIds).subscribe(r => {
        if (r) {
          // update wallet
          r.forEach((entry) => {
            this.walletService.updateBalance(entry.publicId, entry.amount, entry.tick);
          });
          if (callbackFn)
            callbackFn(r);
        }
        this.networkBalanceLoading = false;
      }, errorResponse => {
        this.processError(errorResponse, false);
        this.networkBalanceLoading = false;
      });
    }
  }

  //#region 

  //**  new Archiver Api */

  private getStatusArchiver() {
    this.apiArchiver.getStatus().subscribe(s => {
      if (s) {
        this.status = s;
      }
    }, errorResponse => {
      this.processError(errorResponse, false);
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
      this.processError(errorResponse, false);
      this.tickInfoLoading = false;
    });
  }

  private getCurrentTickArchiver() {
    if (this.tickLoading)
      return;

    this.tickLoading = true;

    this.apiArchiver.getLatestTick().subscribe(latestTick => {
      if (latestTick) {
        this.archiverLatestTick.next(latestTick);
        if (this.transactionsArray.getValue().length <= 0) {
          this.getTransactionsArchiver();
        }
      }
      this.tickLoading = false;
    }, errorResponse => {
      this.processError(errorResponse, false);
      this.tickLoading = false;
    });
  }


  private getTransactionsArchiver(publicIds: string[] | undefined = undefined): void {
    this.numberLastEpoch = this.walletService.getSettings().numberLastEpoch;
    if ((this.transactionArchiverLoading || this.archiverLatestTick.value === 0 || !this.status))
      return;

    if (!publicIds)
      publicIds = this.walletService.getSeeds().filter((s) => !s.isOnlyWatch).map(m => m.publicId);

    let epoch = this.status.lastProcessedTick.epoch;
    let initialTick = 0;

    this.status.processedTickIntervalsPerEpoch
      .filter(e => e.epoch === epoch)
      .forEach(e => {
        initialTick = e.intervals[0].initialProcessedTick;
      });

    epoch = epoch - this.numberLastEpoch;
    this.status.processedTickIntervalsPerEpoch
      .filter(e => e.epoch === epoch)
      .forEach(e => {
        initialTick = e.intervals[0].initialProcessedTick;
      });

    this.transactionArchiverLoading = true;


    if (this.walletService.getSeeds().length > 0) {
      const observables: Observable<TransactionsArchiver[]>[] = publicIds.map(publicId =>
        this.apiArchiver.getTransactions(publicId, initialTick, this.currentTick.value)
      );

      // Combine all observables and collect results
      forkJoin(observables).subscribe(results => {
        // Combine all results into a single array
        const allTransactions = results.flat();

        // Update BehaviorSubject with the combined results
        this.transactionsArray.next(allTransactions);
        this.transactionArchiverLoading = false;
      }, errorResponse => {
        console.error('errorResponse:', errorResponse);
        this.transactionArchiverLoading = false;
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
 * load balances directly from network
 * @returns 
 */
  private getAssets(publicIds: string[] | undefined = undefined, callbackFn: ((balances: QubicAsset[]) => void) | undefined = undefined): void {
    if (!this.isActive || (this.lastAssetsLoaded && new Date().getTime() - this.lastAssetsLoaded.getTime() < (12 * 3600 * 1000))) // only update assets every 12h
      return;

    if (!publicIds)
      publicIds = this.walletService.getSeeds().map(m => m.publicId);

    if (publicIds.length > 0) {
      // todo: Use Websocket!
      this.api.getOwnedAssets(publicIds).subscribe((r: QubicAsset[]) => {
        if (r && r.length > 0) {

          // update wallet
          const groupedAssets = this.groupBy(r, (a: QubicAsset) => a.publicId);
          Object.keys(groupedAssets).forEach(k => {
            this.walletService.updateAssets(k, groupedAssets[k]);
          });

          // remove old entries
          const tickValue = r.reduce((p, c) => p !== 0 && p < c.tick ? p : c.tick, 0);
          if (tickValue !== 0) {
            this.walletService.removeOldAssets(tickValue);
          }

          if (callbackFn)
            callbackFn(r);
        }
      }, errorResponse => {
        this.processError(errorResponse, false);
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
        this.processError(errorResponse, false);
        this.latestStatsLoading = false;
      }
    });
  }


  private processError(errObject: any, showToUser: boolean = true) {
    if (errObject.status == 401) {
      this.api.reAuthenticate();
    } else if (errObject.error && typeof errObject.error === 'string' && errObject.error.indexOf("Amount of Accounts must be between") >= 0) {
      this.errorStatus.next(errObject.error);
    } else if (errObject.statusText) {
      if (showToUser)
        this.errorStatus.next(errObject.error);
    }
  }

  public forceUpdateCurrentTick() {
    this.getCurrentTickArchiver();
  }

  public addQubicTransaction(tx: QubicTransaction): void {
    const newTx: Transaction = {
      amount: Number(tx.amount.getNumber()),
      status: "Broadcasted",
      sourceId: tx.sourcePublicKey.getIdentityAsSring() ?? "",
      destId: tx.destinationPublicKey.getIdentityAsSring() ?? "",
      broadcasted: new Date(),
      id: tx.getId(),
      targetTick: tx.tick,
      created: new Date(),
      isPending: true,
      moneyFlow: false,
      type: tx.inputType
    };
    this.addTransaction(newTx);
  }

  public addTransaction(tx: Transaction): void {
    const list = this.internalTransactions.getValue();
    if (!list.find(f => f.id.slice(0, 56) === tx.id.slice(0, 56))) {
      list.unshift(tx);
      this.internalTransactions.next(list);
    }
  }

  public addTransactions(txs: Transaction[]): void {
    var list = this.internalTransactions.getValue();
    txs.forEach(tx => {
      const existingTx = list.find(f => f.id.slice(0, 56) === tx.id.slice(0, 56));
      if (!existingTx) {
        list.push(tx);
      } else {
        Object.assign(existingTx, tx);
      }
    });
    this.internalTransactions.next(list.sort((a, b) => { return b.targetTick - a.targetTick }));
  }
}
