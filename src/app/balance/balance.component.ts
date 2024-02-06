import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { WalletService } from '../services/wallet.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@ngneat/transloco';
import { BalanceResponse, Transaction } from '../services/api.model';
import { FormControl } from '@angular/forms';
import { UpdaterService } from '../services/updater-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-balance',
  templateUrl: './balance.component.html',
  styleUrls: ['./balance.component.scss']
})
export class BalanceComponent implements OnInit {
  
  public accountBalances: BalanceResponse[] = [];
  public seedFilterFormControl: FormControl = new FormControl();
  public currentTick = 0;
  public transactions: Transaction[] = [];

  constructor(private router: Router, private transloco: TranslocoService, private api: ApiService, private walletService: WalletService, private _snackBar: MatSnackBar, private us: UpdaterService) {
  }

  ngOnInit(): void {
    if(this.hasSeeds()){
      this.us.currentTick.subscribe(s => {
        this.currentTick = s;
      });
      this.us.internalTransactions.subscribe(txs => {
        this.transactions = txs;
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

  getDate() {
    return new Date();
  }

  getTotalBalance(estimated = false): number {
    if(estimated)
      return this.walletService.getSeeds().reduce((a,c) => a + Number(c.balance), 0);
    else
      return this.accountBalances.reduce((p, c) => p + (c.epochBaseAmount), 0);
  }

  hasSeeds() {
    return this.walletService.getSeeds().length > 0;
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
    if(seed !== undefined)
      return '(' + seed.alias + ')';
    else
      return '';
  }

  getSeeds() {
    return this.walletService.getSeeds();
  }

  repeat(transaction: Transaction) {
    this.router.navigate(['payment'], {
      state: {
        template: transaction
      }
    });
  }
}
