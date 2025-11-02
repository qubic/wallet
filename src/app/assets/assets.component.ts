import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { QubicAsset, AssetTransfer } from "../services/api.model";
import { ApiService } from "../services/api.service";
import { FormControl, FormGroup, Validators, FormBuilder, ValidatorFn, AbstractControl, ValidationErrors } from "@angular/forms";
import { WalletService } from '../services/wallet.service';
import { QubicTransferAssetPayload } from '@qubic-lib/qubic-ts-library/dist/qubic-types/transacion-payloads/QubicTransferAssetPayload';
import { QubicTransaction } from '@qubic-lib/qubic-ts-library/dist/qubic-types/QubicTransaction';
import { QubicDefinitions } from '@qubic-lib/qubic-ts-library/dist/QubicDefinitions';
import { lastValueFrom, Subject, combineLatest } from 'rxjs';
import { takeUntil, filter, distinctUntilChanged } from 'rxjs/operators';
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
import { QubicStaticService } from '../services/apis/static/qubic-static.service';
import { StaticSmartContract } from '../services/apis/static/qubic-static.model';

// Interfaces for asset grouping
interface GroupedAsset {
  publicId: string;
  assetName: string;
  issuerIdentity: string;
  totalAmount: number;
  contracts: ContractGroup[];
}
import { QUBIC_ADDRESS_LENGTH } from '../constants/qubic.constants';

interface ContractGroup {
  contractName: string;
  contractIndex: number;
  assets: QubicAsset[];
}

/**
 * Validator to check if the address is all uppercase
 * Qubic addresses must be uppercase letters only
 */
function uppercaseValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Don't validate empty values (required validator handles that)
    }
    const value = control.value as string;
    const isUppercase = value === value.toUpperCase();
    return isUppercase ? null : { notUppercase: true };
  };
}

@Component({
  selector: 'app-assets',
  templateUrl: './assets.component.html',
  styleUrls: ['./assets.component.scss']
})


export class AssetsComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();
  shortenAddress = shortenAddress;
  displayedColumns: string[] = ['publicId', 'ownedAmount', 'managedBy', 'tick', 'actions'];
  public assets: QubicAsset[] = [];
  public groupedAssets: GroupedAsset[] = [];
  public isExpanded: Map<string, boolean> = new Map();
  public currentTick = 0;
  public tickOverwrite = false;

  // Cache for smart contract lookups to avoid repeated array searches
  private smartContractsMap: Map<number, StaticSmartContract> = new Map();
  // Track whether smart contracts data has been loaded to prevent flickering
  public smartContractsLoaded: boolean = false;

  sendForm: FormGroup;
  isAssetsLoading: boolean = false;
  isSending: boolean = false;
  showSendForm: boolean = false;
  isTable: boolean = false;

  public selectedAccountId = false;
  private selectedDestinationId: any;

  private destinationValidators = [Validators.required, uppercaseValidator(), Validators.minLength(QUBIC_ADDRESS_LENGTH), Validators.maxLength(QUBIC_ADDRESS_LENGTH)];

  // Template transaction data for repeating transactions
  private txTemplate: any;
  private txAssetData: AssetTransfer | null = null;
  private txSourceId: string | null = null;
  private txDestId: string | null = null;

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
    private apiLiveService: ApiLiveService,
    private qubicStaticService: QubicStaticService
  ) {

    if (!this.walletService.isWalletReady) {
      this.router.navigate(['/public']); // Redirect to public page if not authenticated
    }

    var dashBoardStyle = localStorage.getItem("asset-grid");
    this.isTable = dashBoardStyle == '0' ? true : false;

    // Check if we're repeating an asset transfer transaction
    const state = this.router.getCurrentNavigation()?.extras.state;
    if (state && state['template']) {
      // We have a template transaction to repeat
      this.txTemplate = state['template'];
      this.txAssetData = state['assetData'];
      this.txSourceId = state['sourceId'];
      this.txDestId = state['destId'];
    }

    this.sendForm = new FormGroup({
      destinationAddress: new FormControl('', this.destinationValidators),
      selectedDestinationId: new FormControl(''),
      amount: new FormControl('', Validators.required),
      tick: new FormControl('', Validators.required),
      assetSelect: new FormControl('', Validators.required),
    });

    // Use combineLatest to wait for BOTH smart contracts AND wallet config
    combineLatest([
      this.qubicStaticService.smartContracts$.pipe(
        filter(contracts => contracts !== null && contracts.length > 0)
      ),
      this.walletService.onConfig.pipe(
        // Only react when assets actually change by comparing asset arrays
        distinctUntilChanged((prev, curr) => {
          const prevAssets = JSON.stringify(prev.seeds.map(s => ({ id: s.publicId, assets: s.assets })));
          const currAssets = JSON.stringify(curr.seeds.map(s => ({ id: s.publicId, assets: s.assets })));
          return prevAssets === currAssets;
        })
      )
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([contracts, config]) => {
        // Build smart contracts lookup map (only once per update)
        this.smartContractsMap.clear();
        contracts!.forEach(contract => {
          this.smartContractsMap.set(contract.contractIndex, contract);
        });
        this.smartContractsLoaded = true;

        // Update assets from wallet
        this.assets = this.walletService.getSeeds()
          .filter(p => !p.isOnlyWatch)
          .flatMap(m => m.assets)
          .filter(f => f)
          .map(m => <QubicAsset>m);

        // Compute grouped assets only ONCE when both are ready
        this.computeGroupedAssets();
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

    // Handle template transaction for repeating asset transfers
    if (this.txTemplate) {
      this.handleRepeatTransaction();
    }
  }


  toggleTableView(event: MatSlideToggleChange) {
    this.isTable = event.checked;
    localStorage.setItem("asset-grid", this.isTable ? '0' : '1');
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

  /**
   * Handle repeating an asset transfer transaction
   * Pre-fills the send form with data from the template transaction
   */
  handleRepeatTransaction(): void {
    if (!this.txAssetData) {
      // If we don't have parsed asset data (for non-archiver transactions),
      // just open the form and let user fill it manually
      this.openSendForm();
      return;
    }

    // Find the matching asset from the user's assets
    const assetName = this.txAssetData.assetName;
    const sourceId = this.txSourceId;

    const matchingAsset = this.assets.find(asset =>
      asset.assetName === assetName && asset.publicId === sourceId
    );

    if (!matchingAsset) {
      // Asset not found, show error message
      this._snackBar.open(
        this.t.translate('assetsComponent.messages.assetNotFound'),
        this.t.translate('general.close'),
        { duration: 5000, panelClass: 'error' }
      );
      return;
    }

    // Open the send form with the matching asset
    this.openSendForm(matchingAsset);

    // Pre-fill the destination address and amount
    if (this.txDestId) {
      // Check if destination is one of the wallet's addresses
      const destinationSeed = this.walletService.getSeeds().find(s => s.publicId === this.txDestId);

      if (destinationSeed) {
        // Destination is in the wallet - use address book mode
        this.selectedAccountId = true;
        this.sendForm.controls['selectedDestinationId'].addValidators([Validators.required]);
        this.sendForm.controls['destinationAddress'].clearValidators();
        this.sendForm.controls['destinationAddress'].updateValueAndValidity();
        this.sendForm.controls['selectedDestinationId'].setValue(this.txDestId);
        this.sendForm.controls['selectedDestinationId'].updateValueAndValidity();
      } else {
        // Destination is external - use manual entry mode
        this.sendForm.controls['destinationAddress'].setValue(this.txDestId);
      }
    }

    if (this.txAssetData.units) {
      this.sendForm.controls['amount'].setValue(parseInt(this.txAssetData.units));
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

  /**
   * Compare function for mat-select to properly match assets by identity
   * instead of object reference
   */
  compareAssets(asset1: QubicAsset, asset2: QubicAsset): boolean {
    return asset1 && asset2 && asset1.assetName === asset2.assetName && asset1.publicId === asset2.publicId;
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

  /**
   * Compute grouped assets by publicId + assetName + issuerIdentity
   * Optimized with cached smart contract lookups
   * Only computes if smart contracts data is loaded to prevent flickering
   */
  computeGroupedAssets(): void {
    // Wait for smart contracts to load before computing groups to prevent flickering
    if (!this.smartContractsLoaded) {
      this.groupedAssets = [];
      return;
    }

    const grouped = new Map<string, GroupedAsset>();

    this.assets.forEach(asset => {
      // Create unique key for grouping: publicId + assetName + issuerIdentity
      const key = `${asset.publicId}-${asset.assetName}-${asset.issuerIdentity}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          publicId: asset.publicId,
          assetName: asset.assetName,
          issuerIdentity: asset.issuerIdentity,
          totalAmount: 0,
          contracts: []
        });
      }

      const group = grouped.get(key)!;
      group.totalAmount += asset.ownedAmount || 0;

      // Group by contract - use cached Map lookup instead of array find
      const contractIndex = asset.contractIndex || 0;
      let contractGroup = group.contracts.find(c => c.contractIndex === contractIndex);

      if (!contractGroup) {
        // Fast O(1) lookup from the cached Map instead of O(n) array search
        const smartContract = this.smartContractsMap.get(contractIndex);
        // Use contract label if found, otherwise show index to indicate unknown contract
        const contractName = smartContract?.label || (contractIndex > 0 ? `Contract ${contractIndex}` : '');

        contractGroup = {
          contractName: contractName,
          contractIndex: contractIndex,
          assets: []
        };
        group.contracts.push(contractGroup);
      }

      contractGroup!.assets.push(asset);
    });

    this.groupedAssets = Array.from(grouped.values()).sort((a, b) =>
      a.assetName.localeCompare(b.assetName)
    );
  }

  /**
   * Toggle the expanded state for a specific grouped asset
   */
  toggleExpanded(groupKey: string): void {
    const currentState = this.isExpanded.get(groupKey) || false;
    this.isExpanded.set(groupKey, !currentState);
  }

  /**
   * Check if a specific grouped asset is expanded
   */
  isGroupExpanded(groupKey: string): boolean {
    return this.isExpanded.get(groupKey) || false;
  }

  /**
   * Get the unique key for a grouped asset
   */
  getGroupKey(group: GroupedAsset): string {
    return `${group.publicId}-${group.assetName}-${group.issuerIdentity}`;
  }

  /**
   * Check if any contract in the group has a valid contract name
   */
  hasContractNames(contracts: ContractGroup[]): boolean {
    return contracts.some(contract => contract.contractName && contract.contractName.trim() !== '');
  }

  /**
   * Calculate total owned amount across all contracts for a grouped asset
   */
  getTotalOwnedAmount(group: GroupedAsset): number {
    let total = 0;
    group.contracts.forEach(contract => {
      contract.assets.forEach(asset => {
        if (asset.ownedAmount !== undefined && asset.ownedAmount !== null) {
          total += asset.ownedAmount;
        }
      });
    });
    return total;
  }

  /**
   * Calculate total possessed amount across all contracts for a grouped asset
   */
  getTotalPossessedAmount(group: GroupedAsset): number {
    let total = 0;
    group.contracts.forEach(contract => {
      contract.assets.forEach(asset => {
        if (asset.possessedAmount !== undefined && asset.possessedAmount !== null) {
          total += asset.possessedAmount;
        }
      });
    });
    return total;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
