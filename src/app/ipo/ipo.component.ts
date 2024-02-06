import { Component, OnDestroy, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { WalletService } from '../services/wallet.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@ngneat/transloco';
import { BalanceResponse, ContractDto, IpoBid, IpoBidOverview, ProposalDto, Transaction } from '../services/api.model';
import { FormControl } from '@angular/forms';
import { UpdaterService } from '../services/updater-service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-ipo',
  templateUrl: './ipo.component.html',
  styleUrls: ['./ipo.component.scss']
})
export class IpoComponent implements OnInit, OnDestroy {
  
  public ipoContracts: ContractDto[] = [];
  public loaded: boolean = false;
  public seedFilterFormControl: FormControl = new FormControl();
  public currentTick = 0;
  public userServiceSubscription: Subscription | undefined;
  public ipoBids: Transaction[] = [];


  constructor(private router: Router, private transloco: TranslocoService, private api: ApiService, private walletService: WalletService, private _snackBar: MatSnackBar, private us: UpdaterService) {
   
  }
  ngOnDestroy(): void {
    if(this.userServiceSubscription)
      this.userServiceSubscription.unsubscribe();
  }

  ngOnInit(): void {
    this.init();
  }

  getDate() {
    return new Date();
  }

  init() {
    this.api.getIpoContracts().subscribe(s => {
      this.ipoContracts = s;
      this.loaded = true;
    });
    this.loadBids();
  }
  
  onlyUnique(value: Transaction, index:any, array:Transaction[]) {
    return array.findIndex((f: Transaction) => f.id === value.id) == index;
  }

  // getTransactions(publicId: string | null = null): Transaction[] {
  //   return this.accountBalances.flatMap((b) => b.transactions.filter(f => publicId == null || f.sourceId == publicId || f.destId == publicId))
  //     .filter(this.onlyUnique)
  //     .sort((a,b) =>  { return (<any>new Date(b.created)) - (<any>new Date(a.created))});
  // }

  isOwnId(publicId: string): boolean {
    return this.walletService.getSeeds().find(f => f.publicId == publicId) !== undefined;
  }

  getSeedName(publicId: string): string {
    var seed = this.walletService.getSeeds().find(f => f.publicId == publicId);
    if(seed !== undefined)
      return '(' + seed.alias + ')';
    else
      return '';
  }

  getSeeds() {
    return this.walletService.getSeeds();
  }

  loadBids(contractId: number | null = null) {
    this.api.getCurrentIpoBids(this.getSeeds().map(m => m.publicId)).subscribe(s => {
      this.ipoBids = s;
    });
  }

  repeat(transaction: Transaction) {
    this.router.navigate(['payment'], {
      state: {
        template: transaction
      }
    });
  }

  getBids(contractId: number) {
    // todo: map bids to correct contractid
    return this.ipoBids;
  }

  openStats() {
    window.open("https://live.qubic.li/ipo", "_blank");
  }

  getTotalPrice(bids: IpoBid[]){
    return bids.reduce((p,c) => p += c.price, 0);
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

  groupBy(list: any[], keyGetter: (n: any) => any ) {
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
