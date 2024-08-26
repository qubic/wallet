import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, Validators } from '@angular/forms';
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
    amount: ['0'], // , [Validators.required, Validators.pattern(/^[0-9, ]*$/), this.trimmedMinValidator]],
  });
  public seeds: ISeed[] = [];
  public selectedSeed: string = '';
  public isChecking = false;

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
    this.redirectIfWalletNotReady();
    this.setupSourceIdValueChange();
    this.subscribeToTimeUpdates();
    this.loadSeeds();
    this.qearnService.txSuccessSubject.subscribe((publicId) => {
      if (publicId) {
        this.qearnComponent.selectHistoryTabAndAddress(publicId);
        this.stakeForm.controls.amount.setValue('0');
        this.us.forceUpdateNetworkBalance(publicId, () => {
          this.loadSeeds();
          this.cdf.detectChanges();
        });
      }
    });
    setInterval(() => {
      this.seeds[0].balance += 100000;
      console.log(this.seeds[0].balance)
    }, 1000);
  }

  trackBySeed(index: number, seed: ISeed): string {
    return seed.publicId; // Unique identifier for each seed
  }

  private loadSeeds(): void {
    const seeds = this.walletService.getSeeds();
    if (Array.isArray(seeds)) {
      this.seeds = seeds.map(seed => ({ ...seed }));
      console.log('Seeds loaded:', this.seeds);
    } else {
      console.error('walletService.getSeeds() did not return an array:', seeds);
      this.seeds = [];
    }
    // Optionally, reset the selected sourceId if it's no longer valid
    const currentSourceId = this.stakeForm.controls.sourceId.value;
    if (!this.seeds.find((seed) => seed.publicId === currentSourceId)) {
      this.stakeForm.controls.sourceId.setValue('');
    }
  }

  private redirectIfWalletNotReady(): void {
    if (!this.walletService.isWalletReady) {
      this.router.navigate(['/public']);
    }
  }

  private setupSourceIdValueChange(): void {
    this.stakeForm.controls.sourceId.valueChanges.subscribe((s) => {
      if (s) {
        this.maxAmount = this.walletService.getSeed(s)?.balance ?? 0;
      }
    });
  }

  private subscribeToTimeUpdates(): void {
    this.timeService.getTimeToNewEpoch().subscribe((time) => {
      this.remainingTime = time;
    });
  }

  confirmLock(): void {
    if (!this.walletService.privateKey) {
      this._snackBar.open(this.transloco.translate('paymentComponent.messages.pleaseUnlock'), this.transloco.translate('general.close'), {
        duration: 5000,
        panelClass: 'error',
      });
      return;
    }
    const publicId = this.stakeForm.controls.sourceId.value!;
    const amountToStake = this.stakeForm.controls.amount.value;
    const currency = this.transloco.translate('general.currency');

    const confirmDialog = this.dialog.open(ConfirmDialog, {
      restoreFocus: false,
      data: {
        title: this.transloco.translate('qearn.stakeQubic.confirmDialog.confirmLockTitle'),
        message: `${this.transloco.translate('qearn.stakeQubic.confirmDialog.confirmLockMessage', { amount: this.formatNumberWithCommas(amountToStake!.replace(/\D/g, '') || '0'), currency })}`,
        confirm: this.transloco.translate('qearn.stakeQubic.confirmDialog.confirm'),
      },
    });

    confirmDialog.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          const tick = await lastValueFrom(this.apiArchiver.getCurrentTick());
          const epoch = (await lastValueFrom(this.apiArchiver.getStatus())).lastProcessedTick.epoch;

          const initialBalance = this.walletService.getSeed(publicId)?.balance ?? 0;
          const initialLockedAmountOfThisEpoch = this.qearnService.stakeData[publicId]?.find((data) => data.lockedEpoch === epoch)?.lockedAmount ?? 0;

          const seed = await this.walletService.revealSeed(publicId);
          const result = await this.qearnService.lockQubic(seed, Number(amountToStake?.replace(/\D/g, '')), tick);

          if (result.txResult) {
            const tickAddition = this.walletService.getSettings().tickAddition;
            const newTick = tick + tickAddition;
            this.qearnService.setPendingStake({
              publicId,
              amount: Number(amountToStake?.replace(/\D/g, '')),
              epoch,
              targetTick: newTick,
              type: 'LOCK',
            });

            this._snackBar.open(this.transloco.translate('qearn.stakeQubic.confirmDialog.success'), this.transloco.translate('general.close'), {
              duration: 0,
              panelClass: 'success',
            });

            this.qearnService.monitorStakeTransaction(publicId, initialLockedAmountOfThisEpoch, epoch);
          }
        } catch (error) {
          this._snackBar.open(this.transloco.translate('qearn.stakeQubic.confirmDialog.error'), this.transloco.translate('general.close'), {
            duration: 0,
            panelClass: 'error',
          });
        }
      }
    });
  }

  onSubmit(): void {}

  private formatNumberWithCommas(value: string): string {
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}
