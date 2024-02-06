import { Component, Inject, OnInit } from '@angular/core';
import { QubicAsset } from "../services/api.model";
import { ApiService } from "../services/api.service";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { WalletService } from '../services/wallet.service';
import { QubicTransferAssetPayload } from 'qubic-ts-library/dist/qubic-types/transacion-payloads/QubicTransferAssetPayload';
import { QubicTransaction } from 'qubic-ts-library/dist/qubic-types/QubicTransaction';
import { QubicDefinitions } from 'qubic-ts-library/dist/QubicDefinitions';
import { DynamicPayload } from 'qubic-ts-library/dist/qubic-types/DynamicPayload';
import { lastValueFrom } from 'rxjs';
import { ISeed } from "../model/seed";
import { MAT_DIALOG_DATA, MatDialog } from "@angular/material/dialog";
import { UpdaterService } from "../services/updater-service";
import { UnLockComponent } from '../lock/unlock/unlock.component';
import { TransactionService } from '../services/transaction.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@ngneat/transloco';
import { QubicHelper } from 'qubic-ts-library/dist/qubicHelper';
import { PublicKey } from 'qubic-ts-library/dist/qubic-types/PublicKey';

@Component({
  selector: 'app-assets',
  templateUrl: './assets.component.html',
  styleUrls: ['./assets.component.scss']
})

export class AssetsComponent implements OnInit {

  displayedColumns: string[] = ['publicId', 'contractIndex', 'assetName', 'contractName', 'ownedAmount', 'possessedAmount', 'tick', 'reportingNodes'];
  public assets: QubicAsset[] = [];
  public currentTick = 0;
  public tickOverwrite = false;

  sendForm: FormGroup;
  isAssetsLoading: boolean = false;
  isSending: boolean = false;
  showSendForm: boolean = false;
  balanceTooLow: boolean = false; // logic


  constructor(
    private apiService: ApiService,
    public walletService: WalletService,
    public transactionService: TransactionService,
    private updaterService: UpdaterService,
    private t: TranslocoService,
    private _snackBar: MatSnackBar,
    private dialog: MatDialog) {
    this.sendForm = new FormGroup({
      destinationAddress: new FormControl('', Validators.required),
      amount: new FormControl('', Validators.required),
      tick: new FormControl('', Validators.required),
      assetSelect: new FormControl('', Validators.required),
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
      assetSelectControl.valueChanges.subscribe(() => {
        this.updateAmountValidator();
      });
    }
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

  ngOnInit() {
    this.loadAssets();

    this.updaterService.currentTick.subscribe(tick => {
      this.currentTick = tick;
      this.sendForm.controls['tick'].addValidators(Validators.min(tick));
      if (!this.tickOverwrite) {
        this.sendForm.controls['tick'].setValue(tick + this.walletService.getSettings().tickAddition);
      }
    })
  }


  refreshData(): void {
    this.loadAssets(true);
  }

  loadAssets(force: boolean = false) {
    this.assets = this.walletService.getSeeds().flatMap(m => m.assets).filter(f => f).map(m => <QubicAsset>m);

    if (force || this.assets.length <= 0) {
      this.isAssetsLoading = true;
      this.updaterService.forceLoadAssets((r) => {
        this.isAssetsLoading = false;
        this.assets = r;
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

  openSendForm(): void {
    this.showSendForm = true;

    this.tickOverwrite = false;
    this.sendForm.controls['tick'].setValue(this.currentTick + this.walletService.getSettings().tickAddition);

    const assetSelectControl = this.sendForm.get('assetSelect');
    if (assetSelectControl && this.assets.length > 0) {
      assetSelectControl.setValue(this.assets[0]);
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
    if(!(await targetAddress.verifyIdentity())){
      this._snackBar.open("INVALID RECEIVER ADDRESSS", this.t.translate('general.close'), {
        duration: 10000,
        panelClass: "error"
      });
      return;
    }

    let targetTick = this.sendForm.get("tick")?.value ?? 0;;
    // todo: think about if we want to let the user set a custom target tick

    if (!this.tickOverwrite || targetTick == 0) {
      const currentTick = await lastValueFrom(this.apiService.getCurrentTick());
      targetTick = currentTick.tick + this.walletService.getSettings().tickAddition; // set tick to send tx
    }

    // load the seed from wallet service
    const signSeed = await this.walletService.revealSeed(sourcePublicKey); // must be the seed to sign the transaction

    const assetTransfer = new QubicTransferAssetPayload()
      .setIssuer(sourceAsset.issuerIdentity)
      .setPossessor(sourcePublicKey)
      .setnewOwner(targetAddress)
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
      this._snackBar.open(this.t.translate('paymentComponent.messages.storedForPropagation', { tick: tx.tick }), this.t.translate('general.close'), {
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
}
