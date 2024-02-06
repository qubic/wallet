import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { QubicTransaction } from 'qubic-ts-library/dist/qubic-types/QubicTransaction';
import { BalanceResponse, MarketInformation, NetworkBalance, QubicAsset, Transaction } from './api.model';
import { ApiService } from './api.service';
import { WalletService } from './wallet.service';
import { VisibilityService } from './visibility.service';

@Injectable({
  providedIn: 'root'
})
export class UpdaterService {

  public currentTick: BehaviorSubject<number> = new BehaviorSubject(0);
  public currentBalance: BehaviorSubject<BalanceResponse[]> = new BehaviorSubject<BalanceResponse[]>([]);
  public currentPrice: BehaviorSubject<MarketInformation> = new BehaviorSubject<MarketInformation>({ supply: 0, price: 0, capitalization: 0, currency: 'USD' });
  public internalTransactions: BehaviorSubject<Transaction[]> = new BehaviorSubject<Transaction[]>([]); // used to store internal tx
  public errorStatus: BehaviorSubject<string> = new BehaviorSubject<string>("");
  private tickLoading = false;
  private balanceLoading = false;
  private currentPriceLoading = false;
  private networkBalanceLoading = false;
  private isActive = true;
  private lastAssetsLoaded: Date | undefined;



  constructor(private visibilityService: VisibilityService, private api: ApiService, private walletService: WalletService) {
    this.init();
  }


  private init(): void {
    this.getCurrentTick();
    this.getCurrentBalance();
    this.getNetworkBalances();
    this.getAssets();
    this.getCurrentPrice();
    // every 30 seconds
    setInterval(() => {
      this.getCurrentTick();
    }, 30000);
    // every minute
    setInterval(() => {
      this.getCurrentBalance();
      this.getNetworkBalances();
      this.getAssets();
    }, 60000);
    // every hour
    setInterval(() => {
      this.getCurrentPrice();
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

  private getCurrentTick() {
    if (this.tickLoading || !this.isActive)
      return;

    this.tickLoading = true;
    // todo: Use Websocket!
    this.api.getCurrentTick().subscribe(r => {
      if (r && r.tick) {
        this.currentTick.next(r.tick);
      }
      this.tickLoading = false;
    }, errorResponse => {
      this.processError(errorResponse, false);
      this.tickLoading = false;
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
        if (r) {

          // update wallet
          const groupedAssets = this.groupBy(r, (a: QubicAsset) => a.publicId);
          Object.keys(groupedAssets).forEach(k => {
            this.walletService.updateAssets(k, groupedAssets[k]);
          });

          // remove old entries
          this.walletService.removeOldAssets(r.reduce((p, c) => p !== 0 && p < c.tick ? p : c.tick, 0));

          if (callbackFn)
            callbackFn(r);
        }
      }, errorResponse => {
        this.processError(errorResponse, false);
      });
    }
  }

  /**
    * load balances directly from network
    * @returns 
    */
  private getCurrentPrice(callbackFn: ((mi: MarketInformation) => void) | undefined = undefined): void {
    if (!this.isActive || this.currentPriceLoading)
      return;

    this.currentPriceLoading = true;

    // todo: Use Websocket!
    this.api.getCurrentPrice().subscribe((r: MarketInformation) => {
      if (r) {
        this.currentPrice.next(r);
       
        if (callbackFn)
          callbackFn(r);

          
      }
      this.currentPriceLoading = false;
    }, errorResponse => {
      this.processError(errorResponse, false);
      this.currentPriceLoading = false;
    });
  }


  private processError(errObject: any, showToUser: boolean = true) {
    if (errObject.status == 401) {
      this.api.reAuthenticate();
    } else if (errObject.error.indexOf("Amount of Accounts must be between") >= 0) {
      this.errorStatus.next(errObject.error);
    } else if (errObject.statusText) {
      if (showToUser)
        this.errorStatus.next(errObject.error);
    }
  }

  public forceUpdateCurrentTick() {
    this.getCurrentTick();
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
      moneyFlow: false
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
