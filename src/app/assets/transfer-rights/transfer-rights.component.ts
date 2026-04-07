import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, combineLatest, lastValueFrom } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { TranslocoService } from '@ngneat/transloco';
import { DecimalPipe } from '@angular/common';

import { UnLockComponent } from '../../lock/unlock/unlock.component';
import { ConfirmDialog } from '../../core/confirm-dialog/confirm-dialog.component';

import { QubicAsset } from '../../services/api.model';
import { WalletService } from '../../services/wallet.service';
import { TransactionService } from '../../services/transaction.service';
import { UpdaterService } from '../../services/updater-service';
import { ApiLiveService } from '../../services/apis/live/api.live.service';
import { QubicStaticService } from '../../services/apis/static/qubic-static.service';
import { StaticSmartContract } from '../../services/apis/static/qubic-static.model';

import { QubicTransaction } from '@qubic-lib/qubic-ts-library/dist/qubic-types/QubicTransaction';
import { QubicDefinitions } from '@qubic-lib/qubic-ts-library/dist/QubicDefinitions';
import { PublicKey } from '@qubic-lib/qubic-ts-library/dist/qubic-types/PublicKey';
import { DynamicPayload } from '@qubic-lib/qubic-ts-library/dist/qubic-types/DynamicPayload';

import { shortenAddress } from '../../utils/address.utils';
import { findManagementRightsProcedure, canReceiveTransferRights } from '../../utils/smart-contract.utils';

/**
 * Interface for contracts that can manage assets
 */
interface ManagingContractOption {
  contractIndex: number;
  contractName: string;
  address: string;
  procedureId: number;
  procedureFee: number;
  availableBalance: number;
}

/**
 * Interface for source contracts with asset balances
 */
interface SourceContractOption extends ManagingContractOption {
  asset: QubicAsset;
  procedureType: 'transfer' | 'revoke';
}

/**
 * Interface for asset selection dropdown
 */
interface AssetOption {
  asset: QubicAsset;
  totalAvailableBalance: number;
  owningContracts: SourceContractOption[];
}

@Component({
  selector: 'app-transfer-rights',
  templateUrl: './transfer-rights.component.html',
  styleUrls: ['./transfer-rights.component.scss']
})
export class TransferRightsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Utility functions
  shortenAddress = shortenAddress;

  // Form and UI state
  transferRightsForm: FormGroup;
  isLoading: boolean = false;
  isSubmitting: boolean = false;
  currentTick: number = 0;
  tickOverwrite: boolean = false;

  // Smart contracts data
  private smartContractsMap: Map<number, StaticSmartContract> = new Map();
  public smartContractsLoaded: boolean = false;
  private isLoadingAssets: boolean = false;

  // Asset and contract options
  public assets: AssetOption[] = [];
  public sourceContracts: SourceContractOption[] = [];
  public filteredSourceContracts: SourceContractOption[] = [];
  public destinationContracts: ManagingContractOption[] = [];
  public filteredDestinationContracts: ManagingContractOption[] = [];

  // Selected values for dynamic updates
  public selectedAsset: AssetOption | null = null;
  public selectedSourceContract: SourceContractOption | null = null;
  public selectedDestinationContract: ManagingContractOption | null = null;

  // Pre-selected asset information from navigation
  private preSelectedAsset: { publicId: string; assetName: string; issuerIdentity: string; contractIndex: number } | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    public walletService: WalletService,
    private transactionService: TransactionService,
    private updaterService: UpdaterService,
    private apiLiveService: ApiLiveService,
    private qubicStaticService: QubicStaticService,
    private snackBar: MatSnackBar,
    private translocoService: TranslocoService,
    private decimalPipe: DecimalPipe,
    private dialog: MatDialog
  ) {
    // Initialize form
    this.transferRightsForm = this.fb.group({
      selectedAsset: ['', Validators.required],
      sourceContract: ['', Validators.required],
      destinationContract: ['', Validators.required],
      numberOfShares: ['', [Validators.required, Validators.min(1)]],
      tick: ['', Validators.required]
    }, {
      validators: [this.contractsNotEqualValidator()]
    });
  }

  ngOnInit(): void {
    // Capture query parameters once on init
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(queryParams => {
        if (queryParams?.['publicId'] && queryParams?.['assetName'] && queryParams?.['issuerIdentity'] && queryParams?.['contractIndex']) {
          this.preSelectedAsset = {
            publicId: queryParams['publicId'],
            assetName: queryParams['assetName'],
            issuerIdentity: queryParams['issuerIdentity'],
            contractIndex: Number(queryParams['contractIndex'])
          };
        }
      });

    // Load smart contracts data
    combineLatest([
      this.qubicStaticService.smartContracts$.pipe(
        filter(contracts => contracts !== null && contracts.length > 0)
      ),
      this.walletService.onConfig
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([contracts, config]) => {
        // Build smart contracts lookup map
        this.smartContractsMap.clear();
        contracts!.forEach(contract => {
          this.smartContractsMap.set(contract.contractIndex, contract);
        });
        this.smartContractsLoaded = true;

        // Load assets after contracts are loaded
        this.loadAssets();
      });

    // Subscribe to current tick updates
    this.updaterService.currentTick
      .pipe(takeUntil(this.destroy$))
      .subscribe(tick => {
        this.currentTick = tick;
        // Replace validators instead of adding to prevent accumulation
        this.transferRightsForm.controls['tick'].setValidators([Validators.required, Validators.min(tick)]);
        this.transferRightsForm.controls['tick'].updateValueAndValidity({ emitEvent: false });
        if (!this.tickOverwrite) {
          const tickAddition = this.walletService.getSettings().tickAddition;
          this.transferRightsForm.controls['tick'].setValue(tick + tickAddition);
        }
      });

    // Subscribe to form changes for dynamic updates
    this.transferRightsForm.get('selectedAsset')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.onAssetChange(value);
      });

    this.transferRightsForm.get('sourceContract')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.onSourceContractChange(value);
      });

    this.transferRightsForm.get('destinationContract')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.onDestinationContractChange(value);
      });

    this.transferRightsForm.get('numberOfShares')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateSharesValidation();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Custom validator to ensure source and destination contracts are not equal
   */
  private contractsNotEqualValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const sourceContract = control.get('sourceContract')?.value;
      const destinationContract = control.get('destinationContract')?.value;

      if (!sourceContract || !destinationContract) {
        return null;
      }

      const areEqual = sourceContract.contractIndex === destinationContract.contractIndex;
      return areEqual ? { contractsEqual: true } : null;
    };
  }

  /**
   * Load assets from all wallet accounts
   */
  private async loadAssets(): Promise<void> {
    if (!this.smartContractsLoaded) {
      return;
    }

    // Prevent race condition: only allow one loadAssets call at a time
    if (this.isLoadingAssets) {
      return;
    }

    this.isLoadingAssets = true;
    this.isLoading = true;

    try {
      // Get all seeds from wallet (same pattern as AssetsComponent)
      const seeds = this.walletService.getSeeds().filter(p => !p.isOnlyWatch);

      const allAssets: QubicAsset[] = seeds
        .flatMap(m => m.assets)
        .filter(f => f)
        .map(m => <QubicAsset>m);

      // Process assets into source contract options
      this.buildSourceContractOptions(allAssets);

      // Build destination contract options
      this.buildDestinationContractOptions();

      // Re-validate current form selections against rebuilt lists
      this.revalidateFormSelections();

    } catch (error) {
      console.error('Error loading assets:', error);
      this.snackBar.open(
        this.translocoService.translate('transferRights.errors.loadFailed'),
        this.translocoService.translate('general.close'),
        { duration: 5000 }
      );
    } finally {
      this.isLoading = false;
      this.isLoadingAssets = false;
    }
  }

  /**
   * Re-validate current form selections after options are rebuilt.
   * Clears selections that are no longer present in the updated lists.
   */
  private revalidateFormSelections(): void {
    const currentAsset = this.transferRightsForm.get('selectedAsset')?.value as AssetOption | null;
    if (!currentAsset) return;

    const newAsset = this.assets.find(a => this.compareAssets(a, currentAsset));
    if (!newAsset) {
      this.transferRightsForm.patchValue({ selectedAsset: '', sourceContract: '', destinationContract: '' });
      this.selectedAsset = null;
      this.selectedSourceContract = null;
      this.selectedDestinationContract = null;
      return;
    }

    // Update form value and filtered source list with new object references
    this.selectedAsset = newAsset;
    this.filteredSourceContracts = newAsset.owningContracts;
    this.transferRightsForm.patchValue({ selectedAsset: newAsset }, { emitEvent: false });

    const currentSource = this.transferRightsForm.get('sourceContract')?.value as SourceContractOption | null;
    if (!currentSource) return;

    const newSource = newAsset.owningContracts.find(c => c.contractIndex === currentSource.contractIndex);
    if (!newSource) {
      this.transferRightsForm.patchValue({ sourceContract: '', destinationContract: '' });
      this.selectedSourceContract = null;
      this.selectedDestinationContract = null;
      return;
    }

    // Update form value with new object reference and re-filter destinations
    this.selectedSourceContract = newSource;
    this.transferRightsForm.patchValue({ sourceContract: newSource }, { emitEvent: false });
    this.onSourceContractChange(newSource);
  }

  /**
   * Build source contract options from assets
   * Groups assets by contract and filters those with balance > 0
   */
  private buildSourceContractOptions(assets: QubicAsset[]): void {
    const contractMap = new Map<string, SourceContractOption>();
    const assetMap = new Map<string, AssetOption>();

    // First pass: Build source contracts map (existing logic)
    for (const asset of assets) {
      if (asset.ownedAmount <= 0) {
        continue;
      }

      const contract = this.smartContractsMap.get(asset.contractIndex);
      if (!contract) {
        continue;
      }

      // Check if contract has a management rights procedure (transfer or revoke)
      const result = findManagementRightsProcedure(contract);
      if (!result) {
        continue;
      }

      const { procedure, type: procedureType } = result;

      if (procedure.fee == null || procedure.fee < 0) {
        console.warn(`Contract ${contract.name} has invalid procedure fee:`, procedure.fee);
        continue;
      }

      // Create unique key for this asset+contract combination
      const contractKey = `${asset.publicId}-${asset.assetName}-${asset.issuerIdentity}-${asset.contractIndex}`;

      if (!contractMap.has(contractKey)) {
        const sourceContract: SourceContractOption = {
          contractIndex: asset.contractIndex,
          contractName: contract.label || contract.name,
          address: contract.address,
          procedureId: procedure.id,
          procedureFee: procedure.fee,
          availableBalance: asset.ownedAmount,
          asset: asset,
          procedureType: procedureType
        };
        contractMap.set(contractKey, sourceContract);

        // Group by asset (without contractIndex)
        const assetKey = `${asset.publicId}-${asset.assetName}-${asset.issuerIdentity}`;

        if (!assetMap.has(assetKey)) {
          assetMap.set(assetKey, {
            asset: asset,
            totalAvailableBalance: 0,
            owningContracts: []
          });
        }

        const assetOption = assetMap.get(assetKey)!;
        assetOption.owningContracts.push(sourceContract);
        assetOption.totalAvailableBalance += asset.ownedAmount;
      }
    }

    // Sort owning contracts by balance descending within each asset group
    for (const assetOption of assetMap.values()) {
      assetOption.owningContracts.sort((a, b) => b.availableBalance - a.availableBalance);
    }

    // Convert to array (only used for length checks in template)
    this.sourceContracts = Array.from(contractMap.values());

    this.assets = Array.from(assetMap.values())
      .sort((a, b) => {
        const nameCompare = a.asset.assetName.localeCompare(b.asset.assetName, undefined, { sensitivity: 'base' });
        if (nameCompare !== 0) return nameCompare;
        return a.asset.publicId.localeCompare(b.asset.publicId, undefined, { sensitivity: 'base' });
      });

    // Pre-select asset and contract only on first load
    if (this.preSelectedAsset && this.assets.length > 0) {
      const preSelected = this.preSelectedAsset;
      this.preSelectedAsset = null;

      const matchingAsset = this.assets.find(a =>
        a.asset.publicId === preSelected.publicId &&
        a.asset.assetName === preSelected.assetName &&
        a.asset.issuerIdentity === preSelected.issuerIdentity
      );

      if (matchingAsset) {
        // Use setTimeout to ensure the form is ready
        setTimeout(() => {
          this.transferRightsForm.patchValue({
            selectedAsset: matchingAsset
          });

          const matchingContract = matchingAsset.owningContracts.find(c =>
            c.contractIndex === preSelected.contractIndex
          );

          if (matchingContract) {
            this.transferRightsForm.patchValue({
              sourceContract: matchingContract
            });
          }
        });
      }
    }
  }

  /**
   * Build destination contract options
   * Lists all contracts that could be valid destinations.
   * The actual filtering depends on the selected source contract's procedure type
   * and is applied in onSourceContractChange.
   */
  private buildDestinationContractOptions(): void {
    const contracts: ManagingContractOption[] = [];

    for (const [contractIndex, contract] of this.smartContractsMap.entries()) {
      // A contract is a valid destination if it has allowTransferShares AND a management rights procedure,
      // OR if it is QX (which is always a valid destination for RevokeAssetManagementRights)
      const hasAllowTransfer = canReceiveTransferRights(contract);
      const mgmtProc = findManagementRightsProcedure(contract);
      const isQx = contract.address === QubicDefinitions.QX_ADDRESS;

      if ((hasAllowTransfer && mgmtProc) || isQx) {
        if (mgmtProc && (mgmtProc.procedure.fee == null || mgmtProc.procedure.fee < 0)) {
          console.warn(`Contract ${contract.name} has invalid procedure fee:`, mgmtProc.procedure.fee);
          continue;
        }

        contracts.push({
          contractIndex: contractIndex,
          contractName: contract.label || contract.name,
          address: contract.address,
          procedureId: mgmtProc?.procedure.id ?? 0,
          procedureFee: mgmtProc?.procedure.fee ?? 0,
          availableBalance: 0
        });
      }
    }

    // Sort alphabetically
    this.destinationContracts = contracts
      .sort((a, b) => a.contractName.localeCompare(b.contractName, undefined, { sensitivity: 'base' }));

    // Initialize filtered list (will be filtered when source contract is selected)
    this.filteredDestinationContracts = this.destinationContracts;
  }

  /**
   * Handle source contract selection change
   * Filters destination contracts based on the source contract's procedure type:
   * - RevokeAssetManagementRights: destination is only QX
   * - TransferShareManagementRights: destination is contracts with allowTransferShares AND TransferShareManagementRights
   */
  private onSourceContractChange(sourceContract: SourceContractOption | null): void {
    this.selectedSourceContract = sourceContract;

    if (sourceContract) {
      if (sourceContract.procedureType === 'revoke') {
        // Revoke: destination can only be QX
        this.filteredDestinationContracts = this.destinationContracts.filter(
          dest => dest.address === QubicDefinitions.QX_ADDRESS
        );
      } else {
        // Transfer: destination must have allowTransferShares AND a management rights procedure
        // Exclude the source contract itself
        this.filteredDestinationContracts = this.destinationContracts.filter(dest => {
          if (dest.contractIndex === sourceContract.contractIndex) return false;
          const contract = this.smartContractsMap.get(dest.contractIndex);
          if (!contract) return false;
          return canReceiveTransferRights(contract) && !!findManagementRightsProcedure(contract);
        });
      }

      // Update shares validation based on available balance
      this.updateSharesValidation();

      // Clear destination if it's no longer in the filtered list
      const currentDest = this.transferRightsForm.get('destinationContract')?.value;
      if (currentDest && !this.filteredDestinationContracts.some(d => d.contractIndex === currentDest.contractIndex)) {
        this.transferRightsForm.patchValue({
          destinationContract: ''
        });
      }

      // Auto-select destination if only one option
      if (this.filteredDestinationContracts.length === 1 && !this.transferRightsForm.get('destinationContract')?.value) {
        this.transferRightsForm.patchValue({
          destinationContract: this.filteredDestinationContracts[0]
        });
      }
    } else {
      // Reset filtered destination contracts to show all
      this.filteredDestinationContracts = this.destinationContracts;

      this.transferRightsForm.get('numberOfShares')?.clearValidators();
      this.transferRightsForm.get('numberOfShares')?.addValidators([Validators.required, Validators.min(1)]);
      this.transferRightsForm.get('numberOfShares')?.updateValueAndValidity();
    }
  }

  /**
   * Handle destination contract selection change
   */
  private onDestinationContractChange(destinationContract: ManagingContractOption | null): void {
    this.selectedDestinationContract = destinationContract;

    // Trigger form validation to check if source and destination are equal
    this.transferRightsForm.updateValueAndValidity();
  }

  /**
   * Handle asset selection change
   */
  private onAssetChange(asset: AssetOption | null): void {
    this.selectedAsset = asset;

    if (asset) {
      // Filter source contracts to only show contracts managing this asset
      this.filteredSourceContracts = asset.owningContracts;

      // Auto-select first contract if only one option
      if (this.filteredSourceContracts.length === 1) {
        this.transferRightsForm.patchValue({
          sourceContract: this.filteredSourceContracts[0],
          destinationContract: ''
        });
      } else {
        // Clear source and destination contract selection
        this.transferRightsForm.patchValue({
          sourceContract: '',
          destinationContract: ''
        });
      }
    } else {
      this.filteredSourceContracts = [];
      this.transferRightsForm.patchValue({
        sourceContract: '',
        destinationContract: '',
        numberOfShares: null
      });
    }
  }

  /**
   * Compare two assets for mat-select equality
   */
  public compareAssets(a1: AssetOption | null, a2: AssetOption | null): boolean {
    if (!a1 || !a2) {
      return a1 === a2;
    }
    return a1.asset.assetName === a2.asset.assetName &&
      a1.asset.issuerIdentity === a2.asset.issuerIdentity &&
      a1.asset.publicId === a2.asset.publicId;
  }

  /**
   * Update shares field validation based on available balance
   */
  private updateSharesValidation(): void {
    if (this.selectedSourceContract) {
      const maxShares = this.selectedSourceContract.availableBalance;
      this.transferRightsForm.get('numberOfShares')?.setValidators([
        Validators.required,
        Validators.min(1),
        Validators.max(maxShares)
      ]);
      this.transferRightsForm.get('numberOfShares')?.updateValueAndValidity({ emitEvent: false });
    }
  }

  /**
   * Set number of shares to maximum available
   */
  public setMaxShares(): void {
    if (this.selectedSourceContract) {
      this.transferRightsForm.patchValue({
        numberOfShares: this.selectedSourceContract.availableBalance
      });
    }
  }

  /**
   * Get the current transaction fee
   */
  public getTransactionFee(): number {
    if (!this.selectedSourceContract) {
      return 0;
    }
    return this.selectedSourceContract.procedureFee;
  }

  /**
   * Check if source account has enough balance to pay fees
   */
  public canPayFees(): boolean {
    if (!this.selectedSourceContract) {
      return false;
    }

    const seed = this.walletService.getSeed(this.selectedSourceContract.asset.publicId);
    if (!seed) {
      return false;
    }

    return seed.balance >= this.getTransactionFee();
  }

  /**
   * Get balance after deducting transaction fees
   * Follows Asset Transfer pattern for consistency
   */
  public getBalanceAfterFees(): number {
    if (!this.selectedSourceContract) {
      return 0;
    }

    const seed = this.walletService.getSeed(this.selectedSourceContract.asset.publicId);
    if (!seed) {
      return 0;
    }

    const balanceAfterFees = BigInt(seed.balance) - BigInt(this.getTransactionFee());
    return Number(balanceAfterFees);
  }

  /**
   * Get seed alias for display
   */
  public getSeedAlias(publicId: string): string {
    const seed = this.walletService.getSeed(publicId);
    return seed?.alias || 'Unknown';
  }

  /**
   * Compare function for mat-select
   */
  public compareContracts(c1: ManagingContractOption, c2: ManagingContractOption): boolean {
    return c1 && c2 && c1.contractIndex === c2.contractIndex;
  }

  /**
   * Navigate back to assets page
   */
  public goBack(): void {
    this.router.navigate(['/assets-area']);
  }

  /**
   * Load vault file (private key)
   */
  public loadKey(): void {
    const dialogRef = this.dialog.open(UnLockComponent, { restoreFocus: false });
  }

  /**
   * Show confirmation dialog before submitting transaction
   */
  private async showConfirmationDialog(): Promise<boolean> {
    const numberOfShares = this.transferRightsForm.get('numberOfShares')?.value;
    const dialogRef = this.dialog.open(ConfirmDialog, {
      restoreFocus: false,
      data: {
        title: this.translocoService.translate('transferRights.confirmDialog.title'),
        message: this.translocoService.translate('transferRights.confirmDialog.message', {
          shares: this.decimalPipe.transform(numberOfShares, '1.0-0'),
          assetName: this.selectedSourceContract?.asset.assetName,
          sourceContract: this.selectedSourceContract?.contractName,
          destinationContract: this.selectedDestinationContract?.contractName,
          fee: this.decimalPipe.transform(this.getTransactionFee(), '1.0-0')
        }),
        confirm: this.translocoService.translate('confirmDialog.buttons.confirm'),
        cancel: this.translocoService.translate('confirmDialog.buttons.cancel')
      }
    });

    return await lastValueFrom(dialogRef.afterClosed());
  }

  /**
   * Submit the transfer rights transaction
   */
  public async submitTransferRights(): Promise<void> {
    if (this.transferRightsForm.invalid || this.isSubmitting) {
      return;
    }

    if (!this.selectedSourceContract || !this.selectedDestinationContract) {
      return;
    }

    // Validate fee balance
    if (!this.canPayFees()) {
      this.snackBar.open(
        this.translocoService.translate('transferRights.errors.insufficientFees'),
        this.translocoService.translate('general.close'),
        { duration: 5000 }
      );
      return;
    }

    // Show confirmation dialog
    const confirmed = await this.showConfirmationDialog();
    if (!confirmed) {
      return;
    }

    this.isSubmitting = true;

    let signSeed: string | undefined;
    try {
      const asset = this.selectedSourceContract.asset;
      const numberOfShares = this.transferRightsForm.get('numberOfShares')?.value;
      let targetTick = this.transferRightsForm.get('tick')?.value ?? 0;

      // Get current tick if not overwriting
      if (!this.tickOverwrite || targetTick === 0) {
        const tickInfo = (await lastValueFrom(this.apiLiveService.getTickInfo())).tickInfo;
        targetTick = tickInfo.tick + this.walletService.getSettings().tickAddition;
      }

      // Reveal seed for signing
      signSeed = await this.walletService.revealSeed(asset.publicId);

      // Build payload based on procedure type
      const isRevoke = this.selectedSourceContract.procedureType === 'revoke';
      const encoder = new TextEncoder();
      const issuerPubKey = new PublicKey(asset.issuerIdentity);
      const issuerBytes = issuerPubKey.getPackageData();
      const nameBytes = encoder.encode(asset.assetName);

      let payloadBytes: Uint8Array;
      let dataView: DataView;
      let offset = 0;

      if (isRevoke) {
        // Revoke payload (48 bytes):
        // Asset: issuer (32 bytes) + assetName (8 bytes) = 40 bytes
        // numberOfShares: sint64 = 8 bytes
        payloadBytes = new Uint8Array(48);
        dataView = new DataView(payloadBytes.buffer);

        // Issuer identity (32 bytes)
        payloadBytes.set(issuerBytes, offset);
        offset += 32;

        // Asset name (8 bytes, padded with null bytes)
        payloadBytes.set(nameBytes.slice(0, 8), offset);
        offset += 8;

        // Number of shares (8 bytes, signed int64, little-endian)
        dataView.setBigInt64(offset, BigInt(numberOfShares), true);
      } else {
        // Transfer payload (52 bytes):
        // Asset: issuer (32 bytes) + assetName (8 bytes) = 40 bytes
        // numberOfShares: sint64 = 8 bytes
        // newManagingContractIndex: uint32 = 4 bytes
        payloadBytes = new Uint8Array(52);
        dataView = new DataView(payloadBytes.buffer);

        // Issuer identity (32 bytes)
        payloadBytes.set(issuerBytes, offset);
        offset += 32;

        // Asset name (8 bytes, padded with null bytes)
        payloadBytes.set(nameBytes.slice(0, 8), offset);
        offset += 8;

        // Number of shares (8 bytes, signed int64, little-endian)
        dataView.setBigInt64(offset, BigInt(numberOfShares), true);
        offset += 8;

        // New managing contract index (4 bytes, unsigned int32, little-endian)
        dataView.setUint32(offset, this.selectedDestinationContract.contractIndex, true);
      }

      const payload = new DynamicPayload(payloadBytes.length);
      payload.setPayload(payloadBytes);

      // Build transaction
      // Destination is the SOURCE contract (where rights are being released from)
      const tx = new QubicTransaction()
        .setSourcePublicKey(asset.publicId)
        .setDestinationPublicKey(this.selectedSourceContract.address)
        .setAmount(this.selectedSourceContract.procedureFee)
        .setTick(targetTick)
        .setInputType(this.selectedSourceContract.procedureId)
        .setPayload(payload);

      await tx.build(signSeed);

      // Publish transaction
      const publishResult = await this.transactionService.publishTransaction(tx);

      if (publishResult && publishResult.success) {
        this.snackBar.open(
          this.translocoService.translate('transferRights.messages.success', {
            tick: this.decimalPipe.transform(tx.tick, '1.0-0')
          }),
          this.translocoService.translate('general.close'),
          { duration: 0 }
        );

        // Navigate back to assets page
        this.router.navigate(['/assets-area']);
      } else {
        this.snackBar.open(
          publishResult?.message || this.translocoService.translate('transferRights.errors.publishFailed'),
          this.translocoService.translate('general.close'),
          { duration: 5000 }
        );
      }
    } catch (error) {
      console.error('Error submitting transfer rights:', error);
      this.snackBar.open(
        this.translocoService.translate('transferRights.errors.submitFailed'),
        this.translocoService.translate('general.close'),
        { duration: 5000 }
      );
    } finally {
      // Clear sensitive seed data from memory
      if (signSeed) {
        signSeed = undefined;
      }
      this.isSubmitting = false;
    }
  }
}
