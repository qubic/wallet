import { Component, OnDestroy, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { WalletService } from '../../services/wallet.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@ngneat/transloco';
import { BalanceResponse, ContractDto, ProposalDto, Transaction } from '../../services/api.model';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { UpdaterService } from '../../services/updater-service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { QubicHelper } from 'qubic-ts-library/dist//qubicHelper';
import { UnLockComponent } from 'src/app/lock/unlock/unlock.component';

export interface ComputorSelected {
  name: string;
  completed: boolean;
  subComputors?: ComputorSelected[];
  published: boolean;
  index?: number;
  data?: string;
  publishing: boolean;
  publishStarted?: number;
}

@Component({
  selector: 'app-place-bid',
  templateUrl: './place-bid.component.html',
  styleUrls: ['./place-bid.component.scss']
})
export class PlaceBidComponent implements OnInit, OnDestroy {

  public currentTick = 0;
  public contractIndex: number | undefined;
  private sub: any;
  public balances: BalanceResponse[] = [];
  public tickOverwrite = false;
  public maxAmount: number = 0;
  public ipoContract: ContractDto | undefined;

  public ipoForm = this.fb.group({
    sourceId: ['', [Validators.required]],
    price: [10000, [Validators.required, Validators.min(1)]],
    quantity: [1, [Validators.required, Validators.min(1)]],
    tick: [0, [Validators.required]],
  });

  constructor(private router: Router, 
    private activatedRoute: ActivatedRoute, 
    private transloco: TranslocoService, private api: ApiService, public walletService: WalletService, private _snackBar: MatSnackBar, private us: UpdaterService
    , private route: ActivatedRoute
    , private fb: FormBuilder
    , private dialog: MatDialog
  ) {
    this.activatedRoute.params.subscribe(state => {
      if (state && state['contractId']) {
        this.contractIndex = state['contractId'];
        this.api.currentIpoContracts.subscribe(s => {
          this.ipoContract = s.find(f => f.index == this.contractIndex);
        });
      }
    });
  }
  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  ngOnInit(): void {
   this.init();
  }
  init(): void {
    this.sub = this.us.currentBalance.subscribe(s => {
      this.balances = s;
    });
    this.us.currentTick.subscribe(tick => {
      this.currentTick = tick;
      this.ipoForm.controls.tick.addValidators(Validators.min(tick));
      if (!this.tickOverwrite) {
        this.ipoForm.controls.tick.setValue(tick + 10);
      }
    })
    this.ipoForm.controls.sourceId.valueChanges.subscribe(s => {
      if (s) {
        // try to get max amount
        this.getMaxAmount(s);
      }
    });
  }

 
  hasSeeds() {
    return this.walletService.getSeeds().length > 0;
  }

  onlyUnique(value: Transaction, index: any, array: Transaction[]) {
    return array.findIndex((f: Transaction) => f.id === value.id) == index;
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


  setComputor(comp: ComputorSelected, ev: any) {
    comp.completed = ev;
  }

  loadKey() {
    const dialogRef = this.dialog.open(UnLockComponent, { restoreFocus: false });
  }
  getMaxAmount(publicId: string) {
    this.us.currentBalance.subscribe(s => {
      if (s && s.length > 0 && s.find(f => f.publicId == publicId)) {
        this.maxAmount = s.find(f => f.publicId == publicId)?.currentEstimatedAmount ?? s.find(f => f.publicId == publicId)?.epochBaseAmount ?? 0;
      } else {
        this.maxAmount = 0;
      }
    });
  }

  setAmounToMax(addAmount: number = 0) {
    this.ipoForm.controls.price.setValue(this.maxAmount + addAmount);
  }

  onSubmit(): void {
    if (!this.walletService.privateKey) {
      this._snackBar.open(this.transloco.translate('ipoComponent.messages.unlock'), this.transloco.translate('general.close'), {
        duration: 5000,
        panelClass: "error"
      });
    }

    // todo: create service: same is used in payment component.

    if (this.ipoForm.valid && this.ipoContract) {
      this.walletService.revealSeed((<any>this.ipoForm.controls.sourceId.value)).then(s => {
        new QubicHelper().createIpo(s, this.ipoContract?.index!, this.ipoForm.controls.price.value!, this.ipoForm.controls.quantity.value!, this.ipoForm.controls.tick.value!).then(tx => {
          // hack to get uintarray to array for sending to api
          this.api.submitTransaction({ SignedTransaction: this.walletService.arrayBufferToBase64(tx) }).subscribe(r => {
            if (r && r.id) {
              this._snackBar.open(this.transloco.translate('ipoComponent.messages.unlock', { id: r.id}), this.transloco.translate('general.close'), {
                duration: 3000,
              });
              // this.init();
              this.router.navigate(['/ipo']);
            }
          }, er => {
            this._snackBar.open(this.transloco.translate('ipoComponent.messages.failedToSend'), this.transloco.translate('general.close'), {
              duration: 5000,
              panelClass: "error"
            });
          });
        });
      }).catch(e => {
        this._snackBar.open(this.transloco.translate('ipoComponent.messages.failedToDecrypt'), this.transloco.translate('general.close'), {
          duration: 10000,
          panelClass: "error"
        });
      });
    } else {
      this._snackBar.open(this.transloco.translate('ipoComponent.messages.failedToValidate'), this.transloco.translate('general.close'), {
        duration: 5000,
        panelClass: "error"
      });
    }
  }

  getTotalAmount(): number {
    if(this.ipoForm.controls['price'].value && this.ipoForm.controls['quantity'].value && this.ipoForm.controls['quantity'].value > 0 && this.ipoForm.controls['price'].value > 0)
      return this.ipoForm.controls['price'].value * this.ipoForm.controls['quantity'].value;
    else
      return 0;
  }
}
