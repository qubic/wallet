import { Component, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { WalletService } from '../../services/wallet.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from '../../core/confirm-dialog/confirm-dialog.component';
import { TranslocoService } from '@ngneat/transloco';
import { TimeService } from '../../services/time.service';
import { ApiService } from 'src/app/services/api.service';
import { UpdaterService } from 'src/app/services/updater-service';
import { QubicHelper } from 'qubic-ts-library/dist/qubicHelper';
import { lastValueFrom } from 'rxjs';
import { QearnService } from '../../services/qearn.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiArchiverService } from 'src/app/services/api.archiver.service';

function trimmedMinValidator(control: AbstractControl): ValidationErrors | null {
  const trimmedValue = Number(control.value.replace(/\D/g, ''));
  return trimmedValue > 10000000 ? null : { min: true };
}
function formatNumberWithCommas(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatNumberWithSpaces(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

@Component({
  selector: 'app-staking',
  templateUrl: './staking.component.html',
  styleUrls: ['./staking.component.scss'],
})
export class StakingComponent {
  public maxAmount = 0;
  public stakeAmount = 0;
  public remainingTime = { days: 0, hours: 0, minutes: 0 };
  public tick = 0;
  public stakeForm = this.fb.group({
    sourceId: ['', Validators.required],
    amount: ['0', [Validators.required, Validators.pattern(/^[0-9, ]*$/), trimmedMinValidator]],
  });
  public seeds = this.walletService.getSeeds();

  @ViewChild('selectedDestinationId', { static: false })
  public tickOverwrite = false;
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
    private apiArchiver: ApiArchiverService
  ) {}

  ngOnInit(): void {
    this.redirectIfWalletNotReady();
    this.setupSourceIdValueChange();
    this.subscribeToTimeUpdates();
  }

  async lockQubic(seed: string, amount: number, tick: number) {
    return this.qearnService.lockQubic(seed, amount, tick);
  }

  async unLockQubic(seed: string, amount: number, epoch: number, tick: number) {
    return this.qearnService.unLockQubic(seed, amount, epoch, tick);
  }

  async getLockInfoPerEpoch(epoch: number) {
    return this.qearnService.getLockInfoPerEpoch(epoch);
  }

  async getUserLockInfo(user: Uint8Array, epoch: number) {
    return this.qearnService.getUserLockInfo(user, epoch);
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
        this.updateAmountValidators();
        if (this.stakeAmount > this.maxAmount) {
          this.stakeForm.controls.amount.setErrors({ exceedsBalance: true });
        }
      }
    });
  }

  private updateAmountValidators(): void {
    this.stakeForm.controls.amount.setValidators([Validators.required, Validators.pattern(/^[0-9, ]*$/), trimmedMinValidator]);
    this.stakeForm.controls.amount.updateValueAndValidity();
  }

  private subscribeToTimeUpdates(): void {
    this.timeService.getTimeToNewEpoch().subscribe((time) => {
      this.remainingTime = time;
    });
  }

  validateAmount(event: any): void {
    const value = event.target.value;
    this.stakeAmount = Number(value.replace(/\D/g, ''));
    if (!/^[0-9, ]*$/.test(value)) {
      this.stakeForm.controls.amount.setErrors({ pattern: true });
    }
    if (this.stakeAmount > this.maxAmount) {
      this.stakeForm.controls.amount.setErrors({ exceedsBalance: true });
    }
  }

  setStaking(amount: number): void {
    if (this.stakeForm.valid) {
      this.stakeForm.controls.amount.setValue(amount.toString());
    }
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
        message: `${this.transloco.translate('qearn.stakeQubic.confirmDialog.confirmLockMessage', { amount: formatNumberWithCommas(amountToStake!.replace(/\D/g, '') || '0'), currency })}`,
        confirm: this.transloco.translate('qearn.stakeQubic.confirmDialog.confirm'),
      },
    });

    confirmDialog.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          const tick = await lastValueFrom(this.apiArchiver.getCurrentTick());
          const epoch = (await lastValueFrom(this.apiArchiver.getStatus())).lastProcessedTick.epoch;

          const initialBalance = this.walletService.getSeed(publicId)?.balance ?? 0;
          console.log(initialBalance)
          const initialLockedAmountOfThisEpoch = this.qearnService.stakeData[publicId]?.find(data => data.lockedEpoch === epoch)?.lockedAmount ?? 0;
          console.log(initialLockedAmountOfThisEpoch)
          
          const seed = await this.walletService.revealSeed(publicId);
          const result = await this.qearnService.lockQubic(seed, this.stakeAmount, tick);

          if (result.txResult) {
            const tickAddition = this.walletService.getSettings().tickAddition;
            const newTick = tick + tickAddition;
            this.qearnService.setPendingStake({
              publicId,
              amount: this.stakeAmount,
              targetTick: newTick,
              type: 'LOCK',
            });

            this._snackBar.open(this.transloco.translate('qearn.stakeQubic.confirmDialog.success'), this.transloco.translate('general.close'), {
              duration: 0,
              panelClass: 'success',
            });

            this.us.currentTick.subscribe(async (tick) => {
              console.log(tick, this.qearnService.pendingStake?.targetTick)
              if(this.qearnService.pendingStake !== null && tick > this.qearnService.pendingStake.targetTick + 2) {
                if (publicId) await this.qearnService.fetchStakeDataPerEpoch(publicId, epoch, epoch);
                const updatedLockedAmountOfThisEpoch = this.qearnService.stakeData[publicId].find(data => data.lockedEpoch === epoch)?.lockedAmount ?? 0;
                console.log(initialLockedAmountOfThisEpoch, updatedLockedAmountOfThisEpoch)
                if(initialLockedAmountOfThisEpoch === updatedLockedAmountOfThisEpoch) {
                  this._snackBar.open("Transaction Failed", this.transloco.translate('general.close'), {
                    duration: 0,
                    panelClass: 'error',
                  });
                } else {
                  this._snackBar.open("Transaction Successed!", this.transloco.translate('general.close'), {
                    duration: 0,
                    panelClass: 'success',
                  });
                }
                this.qearnService.setPendingStake(null);
              }
            })
          }
        } catch (error) {
          console.log(error)
          this._snackBar.open(this.transloco.translate('qearn.stakeQubic.confirmDialog.error'), this.transloco.translate('general.close'), {
            duration: 0,
            panelClass: 'error',
          });
        }
      }
    });
  }

  onInputChange(event: any) {
    this.validateAmount(event);
    event.target.value = formatNumberWithCommas(event.target.value.replace(/\D/g, ''));
  }

  onSubmit(): void {}
}
