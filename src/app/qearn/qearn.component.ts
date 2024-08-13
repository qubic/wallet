import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { WalletService } from '../services/wallet.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from '../core/confirm-dialog/confirm-dialog.component';
import { TranslocoService } from '@ngneat/transloco';
import { TimeService } from '../services/time.service';

@Component({
  selector: 'app-qearn',
  templateUrl: './qearn.component.html',
  styleUrls: ['./qearn.component.scss'],
})
export class QearnComponent implements OnInit {
  public maxAmount = 0;
  public stakeAmount = 0;
  public remainingTime = { days: 0, hours: 0, minutes: 0 };

  public stakeForm = this.fb.group({
    sourceId: ['', Validators.required],
    amount: [0, [
      Validators.required,
      Validators.min(10000000),
      Validators.pattern(/^[0-9]*$/)
    ]],
  });

  @ViewChild('selectedDestinationId', { static: false })
  public tickOverwrite = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private walletService: WalletService,
    private timeService: TimeService,
    private dialog: MatDialog,
    private transloco: TranslocoService
  ) { }

  ngOnInit(): void {
    this.redirectIfWalletNotReady();
    this.setupSourceIdValueChange();
    this.subscribeToTimeUpdates();
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

  private updateAmountValidators(): void {
    this.stakeForm.controls.amount.setValidators([
      Validators.required,
      Validators.min(10000000),
      Validators.pattern(/^[0-9]*$/)
    ]);
    this.stakeForm.controls.amount.updateValueAndValidity();
  }

  private subscribeToTimeUpdates(): void {
    this.timeService.getTimeToNewEpoch().subscribe((time) => {
      this.remainingTime = time;
    });
  }

  validateAmount(event: any): void {
    const value = event.target.value;
    if (!/^[0-9]*$/.test(value)) {
      this.stakeForm.controls.amount.setErrors({ pattern: true });
    }
    if (event.target.value > this.maxAmount) {
      this.stakeForm.controls.amount.setErrors({ exceedsBalance: true });
    }
  }

  getSeeds(isDestination = false) {
    return this.walletService.getSeeds().filter(
      (seed) => !isDestination || seed.publicId !== this.stakeForm.controls.sourceId.value
    );
  }

  setStaking(amount: number): void {
    if (this.stakeForm.valid) {
      this.stakeForm.controls.amount.setValue(amount);
    }
  }

  confirmLock(): void {
    const confirmDialog = this.dialog.open(ConfirmDialog, {
      restoreFocus: false,
      data: {
        title: `Staking ${this.transloco.translate('general.currency')}`,
        message: `Do you want to lock ${this.stakeAmount} ${this.transloco.translate('general.currency')}?`,
        cancel: 'Cancel',
        confirm: 'Ok',
      },
    });

    confirmDialog.afterClosed().subscribe((result) => {
      if (result) {
        console.log(result);
      }
    });
  }

  onSubmit(): void {
    // Add form submission logic here
  }
}
