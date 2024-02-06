import { Component, OnDestroy, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { WalletService } from '../services/wallet.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@ngneat/transloco';
import { BalanceResponse, ProposalDto, Transaction } from '../services/api.model';
import { FormControl } from '@angular/forms';
import { UpdaterService } from '../services/updater-service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-voting',
  templateUrl: './voting.component.html',
  styleUrls: ['./voting.component.scss']
})
export class VotingComponent implements OnInit, OnDestroy {
  
  public accountBalances: BalanceResponse[] = [];
  public seedFilterFormControl: FormControl = new FormControl();
  public currentTick = 0;
  public userServiceSubscription: Subscription | undefined;
  public proposals: ProposalDto[] | undefined;

  constructor(private router: Router, private transloco: TranslocoService, private api: ApiService, private walletService: WalletService, private _snackBar: MatSnackBar, private us: UpdaterService) {
   
  }
  ngOnDestroy(): void {
    if(this.userServiceSubscription)
      this.userServiceSubscription.unsubscribe();
  }

  ngOnInit(): void {
    if(this.hasSeeds()){
      this.userServiceSubscription = this.us.currentBalance.subscribe(response => {
        this.accountBalances = response;
      }, errorResponse => {
        this._snackBar.open(errorResponse.error, this.transloco.translate("general.close"), {
          duration: 0,
          panelClass: "error"
        });
      });
    }
    this.api.getProposals().subscribe(s => {
      this.proposals = s;
    });
  }

  getDate() {
    return new Date();
  }

  getTotalBalance(estimaed = false): number {
    if(estimaed)
      return this.accountBalances.reduce((p, c) => p + (c.currentEstimatedAmount), 0);
    else
      return this.accountBalances.reduce((p, c) => p + (c.epochBaseAmount), 0);
  }

  hasSeeds() {
    return this.walletService.getSeeds().length > 0;
  }

  onlyUnique(value: Transaction, index:any, array:Transaction[]) {
    return array.findIndex((f: Transaction) => f.id === value.id) == index;
  }

  getTransactions(publicId: string | null = null): Transaction[] {
    return this.accountBalances.flatMap((b) => b.transactions.filter(f => publicId == null || f.sourceId == publicId || f.destId == publicId))
      .filter(this.onlyUnique)
      .sort((a,b) =>  { return (<any>new Date(b.created)) - (<any>new Date(a.created))});
  }

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

  repeat(transaction: Transaction) {
    this.router.navigate(['payment'], {
      state: {
        template: transaction
      }
    });
  }

  hasComputors() {
    return this.accountBalances.find(f => f.isComputor);
  }
}
