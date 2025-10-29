import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { QubicAsset } from "../services/api.model";
import { ApiService } from "../services/api.service";
import { FormControl, FormGroup, Validators, FormBuilder } from "@angular/forms";
import { WalletService } from '../services/wallet.service';
import { QubicTransferAssetPayload } from '@qubic-lib/qubic-ts-library/dist/qubic-types/transacion-payloads/QubicTransferAssetPayload';
import { QubicTransaction } from '@qubic-lib/qubic-ts-library/dist/qubic-types/QubicTransaction';
import { QubicDefinitions } from '@qubic-lib/qubic-ts-library/dist/QubicDefinitions';
import { lastValueFrom, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatDialog } from "@angular/material/dialog";
import { UpdaterService } from "../services/updater-service";
import { UnLockComponent } from '../lock/unlock/unlock.component';
import { TransactionService } from '../services/transaction.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@ngneat/transloco';
import { PublicKey } from '@qubic-lib/qubic-ts-library/dist/qubic-types/PublicKey';
import { environment } from "../../environments/environment";
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { ApiLiveService } from '../services/apis/live/api.live.service';
import { shortenAddress } from '../utils/address.utils';
import { ExplorerUrlHelper } from '../services/explorer-url.helper';


@Component({
  selector: 'app-assets',
  templateUrl: './assets.component.html',
  styleUrls: ['./assets.component.scss']
})


export class AssetsComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();
  shortenAddress = shortenAddress;
  displayedColumns: string[] = ['publicId', 'contractName', 'ownedAmount', 'tick', 'actions'];
  public assets: QubicAsset[] = [];
  public currentTick = 0;
  public tickOverwrite = false;

  sendForm: FormGroup;
  isAssetsLoading: boolean = false;
  isSending: boolean = false;
  showSendForm: boolean = false;
  isTable: boolean = false;

  public selectedAccountId = false;
  private selectedDestinationId: any;

  private destinationValidators = [Validators.required, Validators.minLength(60), Validators.maxLength(60)];

  @ViewChild('selectedDestinationId', {
    static: false
  }) set selectedDestinationIdContent(content: any) {
    if (content) { // initially setter gets called with undefined
      this.selectedDestinationId = content;
    }
  }

  constructor(
    private apiService: ApiService,
    public walletService: WalletService,
    public transactionService: TransactionService,
    private updaterService: UpdaterService,
    private t: TranslocoService,
    private _snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router,
    private decimalPipe: DecimalPipe,
    private changeDetectorRef: ChangeDetectorRef,
    private apiLiveService: ApiLiveService
  ) {

    if (!this.walletService.isWalletReady) {
      this.router.navigate(['/public']); // Redirect to public page if not authenticated
    }

    var dashBoardStyle = localStorage.getItem("asset-grid");
    this.isTable = dashBoardStyle == '0' ? true : false;

    this.sendForm = new FormGroup({
      destinationAddress: new FormControl('', this.destinationValidators),
      selectedDestinationId: new FormControl(''),
      amount: new FormControl('', Validators.required),
      tick: new FormControl('', Validators.required),
      assetSelect: new FormControl('', Validators.required),
    });

    // subscribe to config changes to receive asset updates
    this.walletService.onConfig
      .pipe(takeUntil(this.destroy$))
      .subscribe(c => {
        this.assets = this.walletService.getSeeds().filter(p => !p.isOnlyWatch).flatMap(m => m.assets).filter(f => f).map(m => <QubicAsset>m);
      });

    // const amountControl = this.sendForm.get('amount');
    const assetSelectControl = this.sendForm.get('assetSelect');

    // todo: check, this causes a max stack call loop
    // why is this needed?

    // if (amountControl) {
    //   amountControl.valueChanges.subscribe(() => {
    //     // this.updateAmountValidator();
    //   });
    // }

    if (assetSelectControl) {
      assetSelectControl.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.updateAmountValidator();
        });
    }
  }

  ngOnInit() {
    this.loadAssets();

    this.updaterService.currentTick
      .pipe(takeUntil(this.destroy$))
      .subscribe(tick => {
        this.currentTick = tick;
        this.sendForm.controls['tick'].addValidators(Validators.min(tick));
        if (!this.tickOverwrite) {
          this.sendForm.controls['tick'].setValue(tick + this.walletService.getSettings().tickAddition);
        }
      });

    this.sendForm.get('assetSelect')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(s => {
        if (s) {
          if (this.sendForm.get('selectedDestinationId') == this.sendForm.get('assetSelect')) {
            this.sendForm.controls['selectedDestinationId'].setValue(null);
          }
        }
      });

    this.sendForm.get('selectedDestinationId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(s => {
        if (s) {
          if (!this.selectedAccountId) {
            this.sendForm.controls['destinationAddress'].setValue(null);
          } else {
            this.sendForm.controls['destinationAddress'].setValue(s);
          }
        }
      });
  }


  toggleTableView(event: MatSlideToggleChange) {
    this.isTable = !this.isTable;
    localStorage.setItem("asset-grid", this.isTable ? '0' : '1');
    this.isTable = event.checked;
    window.location.reload();
  }

  updateAmountValidator(): void {
    const assetSelectControl = this.sendForm.get('assetSelect');
    const amountControl = this.sendForm.get('amount');

    if (assetSelectControl && amountControl) {
      const selectedAsset = assetSelectControl.value;
      const maxAmount = selectedAsset ? selectedAsset.ownedAmount : 0;

      amountControl.setValidators([
        Validators.required,
        Validators.min(1),
        Validators.max(maxAmount)
      ]);

      amountControl.updateValueAndValidity();
    }
  }


  refreshData(): void {
    this.loadAssets(true);
  }

  loadAssets(force: boolean = false) {
    if (force || this.assets.length <= 0) {
      this.isAssetsLoading = true;
      this.updaterService.forceLoadAssets((r) => {
        this.isAssetsLoading = false;
      });
      // timeout because of unpropper handling in forceLoadAssets :()
      window.setTimeout(() => {
        this.isAssetsLoading = false;
      }, 5000);
    }
  }

  handleTickEdit(): void {
    const currentTickValue = this.sendForm.controls['tick'].value;
    if (currentTickValue < this.currentTick) {
      this.sendForm.controls['tick'].setValue(this.currentTick + this.walletService.getSettings().tickAddition);
    }
    this.tickOverwrite = !this.tickOverwrite;
  }

  getSeedAlias(publicId: string) {
    return this.walletService.getSeed(publicId)?.alias;
  }

  openIssuerIdentity(issuerIdentity: string): void {
    window.open(ExplorerUrlHelper.getAddressUrl(issuerIdentity), '_blank');
  }

  getBalanceAfterFees(): number {
    var balanceOfSelectedId = this.walletService.getSeed((<QubicAsset>this.sendForm.controls['assetSelect']?.value)?.publicId)?.balance ?? 0;
    const balanceAfterFees = BigInt(balanceOfSelectedId) - BigInt(environment.assetsFees);
    return Number(balanceAfterFees);
  }

  openSendForm(selectedAsset?: QubicAsset): void {
    this.showSendForm = true;

    this.tickOverwrite = false;
    this.sendForm.controls['tick'].setValue(this.currentTick + this.walletService.getSettings().tickAddition);

    const assetSelectControl = this.sendForm.get('assetSelect');

    if (assetSelectControl) {
      if (selectedAsset) {
        assetSelectControl.setValue(selectedAsset);
      } else if (this.assets.length > 0) {
        assetSelectControl.setValue(this.assets[0]);
      }
      this.updateAmountValidator();
    }
  }

  async onSubmitSendForm() {
    if (this.sendForm.valid) {
      // logic
      this.isSending = true;
      try {
        await this.sendAsset();
      } catch (er) {
        console.error(er);
      }
      finally {
        this.isSending = false;
      }
    }
  }

  cancelSendForm(): void {
    this.showSendForm = false;
    this.tickOverwrite = false;
    this.sendForm.reset();
  }

  async sendAsset() {
    // todo: form/input validation
    // todo: create central transaction service to send transactions!!!!

    // sample send asset function
    const assetSelectControl = this.sendForm.get('assetSelect');
    const amountControl = this.sendForm.get('amount');
    const destinationAddressControl = this.sendForm.get('destinationAddress');

    if (!assetSelectControl || !amountControl || !destinationAddressControl) {
      // todo: error handling
      return;
    }

    const sourceAsset = <QubicAsset>assetSelectControl.value;

    const sourcePublicKey = sourceAsset.publicId; // must be the sender/owner of th easset
    const assetName = sourceAsset.assetName; // must be the name of the asset to be transfered
    const numberOfUnits = amountControl.value; // must be the number of units to be transfered
    const targetAddress = new PublicKey(destinationAddressControl.value);

    // verify target address
    if (!(await targetAddress.verifyIdentity())) {
      destinationAddressControl.setErrors({ invalidAddress: true });
      this.isSending = false;
      return;
    }

    let targetTick = this.sendForm.get("tick")?.value ?? 0;
    // todo: think about if we want to let the user set a custom target tick

    if (!this.tickOverwrite || targetTick == 0) {
      const tickInfo = (await lastValueFrom(this.apiLiveService.getTickInfo())).tickInfo;
      targetTick = tickInfo.tick + this.walletService.getSettings().tickAddition; // set tick to send tx
    }

    // load the seed from wallet service
    const signSeed = await this.walletService.revealSeed(sourcePublicKey); // must be the seed to sign the transaction

    const assetTransfer = new QubicTransferAssetPayload()
      .setIssuer(sourceAsset.issuerIdentity)
      .setNewOwnerAndPossessor(targetAddress)
      .setAssetName(assetName)
      .setNumberOfUnits(numberOfUnits);


    // build and sign tx
    const tx = new QubicTransaction().setSourcePublicKey(sourcePublicKey)
      .setDestinationPublicKey(QubicDefinitions.QX_ADDRESS) // a transfer should go the QX SC
      .setAmount(QubicDefinitions.QX_TRANSFER_ASSET_FEE)
      .setTick(targetTick) // just a fake tick
      .setInputType(QubicDefinitions.QX_TRANSFER_ASSET_INPUT_TYPE)
      .setPayload(assetTransfer);

    await tx.build(signSeed);

    const publishResult = await this.transactionService.publishTransaction(tx);

    if (publishResult && publishResult.success) {
      this._snackBar.open(this.t.translate('paymentComponent.messages.storedForPropagation', { tick: this.decimalPipe.transform(tx.tick, '1.0-0') }), this.t.translate('general.close'), {
        duration: 0,
      });
      this.showSendForm = false;
    }
    else {
      this._snackBar.open(publishResult.message ?? this.t.translate('paymentComponent.messages.failedToSend'), this.t.translate('general.close'), {
        duration: 10000,
        panelClass: "error"
      });
    }
  }

  loadKey() {
    const dialogRef = this.dialog.open(UnLockComponent, { restoreFocus: false });
  }

  getSeeds(isDestination = false) {
    return this.walletService.getSeeds().filter(f => !f.isOnlyWatch && (!isDestination || f.publicId != this.sendForm.get('assetSelect')?.value?.publicId));
  }

  getSelectedDestinationSeed() {
    const publicId = this.sendForm.controls['selectedDestinationId'].value;
    return this.getSeeds(true).find(s => s.publicId === publicId);
  }

  getSelectedAsset() {
    return this.sendForm.controls['assetSelect'].value;
  }

  toggleDestinationSelect() {
    this.selectedAccountId = !this.selectedAccountId;
    this.changeDetectorRef?.detectChanges();
    if (this.selectedAccountId) {
      this.selectedDestinationId.open();
      this.sendForm.get('selectedDestinationId')?.addValidators([Validators.required]);
      this.sendForm.get('destinationAddress')?.clearValidators();
      this.sendForm.get('destinationAddress')?.updateValueAndValidity();
      this.sendForm.get('selectedDestinationId')?.updateValueAndValidity();
    } else {
      this.sendForm.get('destinationAddress')?.addValidators(this.destinationValidators);
      this.sendForm.get('selectedDestinationId')?.clearAsyncValidators();
      this.sendForm.get('destinationAddress')?.updateValueAndValidity();
      this.sendForm.get('selectedDestinationId')?.updateValueAndValidity();
    }
    this.changeDetectorRef?.detectChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
