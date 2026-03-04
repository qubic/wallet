import { Component, OnDestroy, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { WalletService } from '../services/wallet.service';
import { ContractDto, IpoBid, IpoBidOverview, Transaction } from '../services/api.model';
import { Router } from '@angular/router';
import { catchError, forkJoin, of, Subject } from 'rxjs';
import { map, switchMap, takeUntil } from 'rxjs/operators';
import { AddressNameService } from '../services/address-name.service';
import { getDisplayName } from '../utils/address.utils';
import { ApiLiveService } from '../services/apis/live/api.live.service';
import { IpoBidsResponse } from '../services/apis/live/api.live.model';
import { QubicStaticService } from '../services/apis/static/qubic-static.service';
import { StaticSmartContract } from '../services/apis/static/qubic-static.model';
import { ExplorerUrlHelper } from '../services/explorer-url.helper';

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
  public ipoBids: Transaction[] = [];
  private contractAddressMap = new Map<number, string>();
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private api: ApiService,
    private apiLiveService: ApiLiveService,
    private qubicStaticService: QubicStaticService,
    private walletService: WalletService,
    private addressNameService: AddressNameService
  ) { }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {

    if (!this.walletService.isWalletReady) {
      this.router.navigate(['/public']); // Redirect to public page if not authenticated
    }

    this.init();
  }

  init() {
    this.refreshing = true;
    this.loadError = false;
    this.failedBidContracts.clear();
    this.retryingContracts.clear();

    // Step 1: Get active IPOs, then fetch bids for each in parallel
    this.apiLiveService.getActiveIpos().pipe(
      switchMap(activeIpos => {
        if (activeIpos.length === 0) {
          return of({ activeIpos, bidResponses: [] as IpoBidsResponse[], bids: [] as Transaction[], staticContracts: [] as StaticSmartContract[] });
        }

        // Fetch bids, user transactions, and contract addresses in parallel
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
          bids: this.api.getCurrentIpoBids(this.getSeeds().map(m => m.publicId)),
          staticContracts: this.qubicStaticService.getSmartContracts()
        }).pipe(
          map(result => ({ activeIpos, ...result }))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result) => {
        // Build contract address map for matching bids to contracts
        this.contractAddressMap.clear();
        for (const sc of result.staticContracts) {
          this.contractAddressMap.set(sc.contractIndex, sc.address);
        }

        // Map live API responses to existing ContractDto format
        this.ipoContracts = result.activeIpos.map((ipo, i) => {
          const bidResponse = result.bidResponses[i];
          return this.mapToContractDto(ipo.contractIndex, ipo.assetName, bidResponse);
        });
        this.ipoBids = result.bids;

        // Update BehaviorSubject for PlaceBidComponent
        this.api.setIpoContracts(this.ipoContracts);

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

  getContractBids(contractId: number) {
    const destination = this.contractAddressMap.get(contractId);
    if (!destination) {
      return [];
    }

    return this.ipoBids.filter(
      (tx: Transaction) => tx.destId === destination
    );
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
        this.api.setIpoContracts(this.ipoContracts);
      },
      error: () => {
        this.retryingContracts.delete(contractIndex);
      }
    });
  }

  openStats(contractId: number) {
    window.open(`https://ipo.qubic.tools/${contractId}`, "_blank");
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
