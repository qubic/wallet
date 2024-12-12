import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { WalletService } from '../../services/wallet.service';
import { MatDialog } from '@angular/material/dialog';
import { TranslocoService } from '@ngneat/transloco';
import { TimeService } from '../../services/time.service';
import { ApiService } from 'src/app/services/api.service';
import { UpdaterService } from 'src/app/services/updater-service';
import { QearnService } from '../../services/qearn.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiArchiverService } from 'src/app/services/api.archiver.service';
import { lastValueFrom } from 'rxjs';
import { ConfirmDialog } from 'src/app/core/confirm-dialog/confirm-dialog.component';
import { QearnComponent } from '../qearn.component';
import { ISeed } from 'src/app/model/seed';

@Component({
  selector: 'app-staking',
  templateUrl: './staking.component.html',
  styleUrls: ['./staking.component.scss'],
})
export class StakingComponent implements OnInit {
  public maxAmount = 0;
  public remainingTime = { days: 0, hours: 0, minutes: 0 };
  public stakeForm = this.fb.group({
    sourceId: ['', Validators.required],
    amount: [0],
  });
  public seeds: ISeed[] = [];
  public isChecking = false;

  get isStakePending(): boolean | null {
    const pendingStake = this.qearnService.pendingStake;
    const selectedSourceId = this.stakeForm.controls['sourceId'].value;
    return pendingStake && pendingStake.type === 'LOCK' && pendingStake.publicId === selectedSourceId;
  }

  constructor(
    private fb: FormBuilder,
    private router: Router,
    public walletService: WalletService,
    private timeService: TimeService,
    private dialog: MatDialog,
    private transloco: TranslocoService,
    private apiService: ApiService,
    private us: UpdaterService,
    public qearnService: QearnService,
    private _snackBar: MatSnackBar,
    private apiArchiver: ApiArchiverService,
    public qearnComponent: QearnComponent,
    private cdf: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.walletService.isWalletReady) {
      this.router.navigate(['/public']);
      return;
    }

    this.setupSourceIdValueChange();
    this.subscribeToTimeUpdates();
    this.loadSeeds();
    this.subscribeTxSuccess();
  }

  trackBySeed = (index: number, seed: ISeed): string => seed.publicId;

  private loadSeeds(): void {
    const seeds = this.walletService.getSeeds();
    this.seeds = Array.isArray(seeds) ? seeds.map((seed) => ({ ...seed })) : [];

    const currentSourceId = this.stakeForm.get('sourceId')?.value;
    if (!this.seeds.find((seed) => seed.publicId === currentSourceId)) {
      this.stakeForm.get('sourceId')?.setValue('');
    }
  }

  private setupSourceIdValueChange(): void {
    this.stakeForm.get('sourceId')?.valueChanges.subscribe((s) => {
      this.maxAmount = s ? this.walletService.getSeed(s)?.balance ?? 0 : 0;
    });
  }

  private subscribeToTimeUpdates(): void {
    this.timeService.getTimeToNewEpoch().subscribe((time) => {
      this.remainingTime = time;
    });
  }

  private subscribeTxSuccess(): void {
    this.qearnService.txSuccessSubject.subscribe((d) => {
      if (d?.publicId) {
        this.qearnComponent.selectHistoryTabAndAddress(d.publicId);
        this.stakeForm.get('amount')?.setValue(0);
        this.us.forceUpdateNetworkBalance(d.publicId, () => {
          this.loadSeeds();
          this.resetSourceId();
          this.cdf.detectChanges();
        });
      }
    });
  }

  private resetSourceId(): void {
    const currentValue = this.stakeForm.get('sourceId')?.value;
    this.stakeForm.get('sourceId')?.setValue(null);
    setTimeout(() => {
      this.stakeForm.get('sourceId')?.setValue(currentValue!);
    }, 100);
  }

  private async showFullAmountWarningDialog(): Promise<boolean> {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      restoreFocus: false,
      data: {
        title: this.transloco.translate('qearn.stakeQubic.fullAmountWarningTitle'),
        message: this.transloco.translate('qearn.stakeQubic.fullAmountWarningMessage'),
        confirm: this.transloco.translate('confirmDialog.buttons.confirm'),
        cancel: this.transloco.translate('confirmDialog.buttons.cancel')
      },
    });

    return await dialogRef.afterClosed().toPromise();
  }

  async confirmLock(): Promise<void> {
    if (!this.walletService.privateKey) {
      this.showSnackBar('paymentComponent.messages.pleaseUnlock', 'error');
      return;
    }

    const publicId = this.stakeForm.get('sourceId')?.value!;
    const amountToStake = this.stakeForm.get('amount')?.value;
    const maxAmount = this.maxAmount;

    if (amountToStake === maxAmount) {
      const confirmFullAmount = await this.showFullAmountWarningDialog();
      if (!confirmFullAmount) return; // Exit if user does not confirm
    }

    const currency = this.transloco.translate('general.currency');
    const result = await this.showConfirmDialog(amountToStake!, currency);
    if (result) {
      await this.processLock(publicId, amountToStake!);
    }
  }

  private async showConfirmDialog(amount: number, currency: string): Promise<boolean> {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      restoreFocus: false,
      data: {
        title: this.transloco.translate('qearn.stakeQubic.confirmDialog.confirmLockTitle'),
        message: this.transloco.translate('qearn.stakeQubic.confirmDialog.confirmLockMessage', {
          amount: this.formatNumberWithCommas(amount.toString() || '0'),
          currency,
        }),
        confirm: this.transloco.translate('qearn.stakeQubic.confirmDialog.confirm'),
      },
    });

    return await dialogRef.afterClosed().toPromise();
  }

  private async processLock(publicId: string, amountToStake: number): Promise<void> {
    try {
      const tick = await lastValueFrom(this.apiArchiver.getCurrentTick());
      const epoch = (await lastValueFrom(this.apiArchiver.getStatus())).lastProcessedTick.epoch;

      const initialLockedAmountOfThisEpoch = this.qearnService.stakeData[publicId]?.find((data) => data.lockedEpoch === epoch)?.lockedAmount ?? 0;

      const seed = await this.walletService.revealSeed(publicId);
      const result = await this.qearnService.lockQubic(seed, amountToStake, tick);

      if (result.txResult) {
        this.handleSuccessfulLock(publicId, amountToStake, epoch, tick);
      }
    } catch (error) {
      this.showSnackBar('qearn.stakeQubic.confirmDialog.error', 'error');
    }
  }

  private handleSuccessfulLock(publicId: string, amountToStake: number, epoch: number, tick: number): void {
    const tickAddition = this.walletService.getSettings().tickAddition;
    const newTick = tick + tickAddition;

    this.qearnService.setPendingStake({
      publicId,
      amount: amountToStake,
      epoch,
      targetTick: newTick,
      type: 'LOCK',
    });

    this.showSnackBar('qearn.stakeQubic.confirmDialog.success', 'success');
    this.qearnService.monitorStakeTransaction(publicId, this.qearnService.stakeData[publicId]?.find((data) => data.lockedEpoch === epoch)?.lockedAmount ?? 0, epoch);
  }

  private showSnackBar(message: string, panelClass: string): void {
    this._snackBar.open(this.transloco.translate(message), this.transloco.translate('general.close'), { duration: 5000, panelClass: panelClass });
  }

  private formatNumberWithCommas(value: string): string {
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  onSubmit() {}
}
