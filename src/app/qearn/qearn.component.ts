import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { WalletService } from '../services/wallet.service';
import { Transaction } from '../services/api.model';
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
  public maxAmount: number = 0;

  public currentTick = 0;
  public isBroadcasting = false;
  public stakeAmount: number = 0;
  public stakeForm = this.fb.group({
    sourceId: [''],
    amount: [0, [Validators.required, Validators.min(1)]],
  });
  @ViewChild('selectedDestinationId', {
    static: false,
  })
  public tickOverwrite = false;
  public selectedAccountId = false;
  public remainingTime = { days: 0, hours: 0, minutes: 0 };
  constructor(
    private fb: FormBuilder,
    private router: Router,
    public walletService: WalletService,
    private timeService: TimeService,
    private dialog: MatDialog,
    private transloco: TranslocoService) {
    this.stakeAmount = 0;
  }

  ngOnInit(): void {
    if (!this.walletService.isWalletReady) {
      this.router.navigate(['/public']); // Redirect to public page if not authenticated
    }
    this.stakeForm.controls.sourceId.valueChanges.subscribe(s => {
      if (s) {
        this.maxAmount = this.walletService.getSeed(s)?.balance ?? 0;
        console.log(this.walletService.getSeed(s))
      }
    });
    this.timeService.getTimeToNewEpoch().subscribe(time => {
      this.remainingTime = time;
    });
  }

  getSeeds(isDestination = false) {
    return this.walletService.getSeeds().filter((f) => !isDestination || f.publicId != this.stakeForm.controls.sourceId.value);
  }

  setStaking(amount: number): void {
    if (this.stakeForm.valid) {
      this.stakeForm.controls.amount.setValue(amount);
    }
  }

  onSubmit(): void { }

  confirmLock() {
    const confirmDialog = this.dialog.open(ConfirmDialog, {
      restoreFocus: false,
      data: {
        title: `Staking ${this.transloco.translate("general.currency")}`,
        message: `Do you want to lock ${this.stakeAmount} ${this.transloco.translate("general.currency")}?`,
        cancel: 'Cancel',
        confirm: 'Ok',
      },
    });
    confirmDialog.afterClosed().subscribe((result) => {
      if (result) {
        console.log(result)
      }
    });
  }
}
