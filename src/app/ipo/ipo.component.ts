import { Component, OnDestroy, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { WalletService } from '../services/wallet.service';
import { ContractDto, IpoBid, IpoBidOverview, SmartContract, Transaction } from '../services/api.model';
import { Router } from '@angular/router';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AddressNameService } from '../services/address-name.service';
import { getDisplayName } from '../utils/address.utils';

@Component({
  selector: 'app-ipo',
  templateUrl: './ipo.component.html',
  styleUrls: ['./ipo.component.scss']
})
export class IpoComponent implements OnInit, OnDestroy {

  public ipoContracts: ContractDto[] = [];
  public loaded: boolean = false;
  public refreshing: boolean = false;
  public ipoBids: Transaction[] = [];
  public smartContracts: SmartContract[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private api: ApiService,
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

    forkJoin({
      smartContracts: this.api.getSmartContracts(),
      ipoContracts: this.api.getIpoContracts(),
      bids: this.api.getCurrentIpoBids(this.getSeeds().map(m => m.publicId))
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        this.smartContracts = result.smartContracts;
        this.ipoContracts = result.ipoContracts;
        this.ipoBids = result.bids;
        this.loaded = true;
        this.refreshing = false;
      },
      error: () => {
        this.refreshing = false;
      }
    });
  }

  isOwnId(publicId: string): boolean {
    return this.walletService.getSeeds().find(f => f.publicId == publicId) !== undefined;
  }

  getSeedName(publicId: string): string {
    var seed = this.walletService.getSeeds().find(f => f.publicId == publicId);
    if (seed !== undefined)
      return '(' + seed.alias + ')';
    else
      return '';
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
    const destination = this.smartContracts.find(
      sc => sc.contractIndex === contractId
    )?.address;

    if (!destination) {
      return [];
    }

    return this.ipoBids.filter(
      (tx: Transaction) => tx.destId === destination
    );
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
