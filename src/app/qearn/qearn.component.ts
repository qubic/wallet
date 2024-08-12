import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { WalletService } from '../services/wallet.service';
import { Transaction } from '../services/api.model';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from '../core/confirm-dialog/confirm-dialog.component';
import { TranslocoService } from '@ngneat/transloco';

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

  constructor(
    private fb: FormBuilder,
    private router: Router,
    public walletService: WalletService,
    private dialog: MatDialog,
    private transloco: TranslocoService) {
    this.stakeAmount = 0;
  }

  ngOnInit(): void {
    if (!this.walletService.isWalletReady) {
      this.router.navigate(['/public']); // Redirect to public page if not authenticated
    }

    this.maxAmount = this.walletService.getSeeds()[0]?.balance || 0;
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
        confirm: 'Confirm',
      },
    });
    confirmDialog.afterClosed().subscribe((result) => {
      if (result) {
        console.log(result)
      }
    });
  }
}
