import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { Component, Inject, Renderer2 } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { WalletService } from 'src/app/services/wallet.service';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { IDecodedSeed, ISeed } from 'src/app/model/seed';
import { QubicHelper } from '@qubic-lib/qubic-ts-library/dist//qubicHelper';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UnLockComponent } from 'src/app/lock/unlock/unlock.component';
import { TranslocoService } from '@ngneat/transloco';
import { ThemeService } from 'src/app/services/theme.service';
import { QubicDialogWrapper } from '../dialog-wrapper/dialog-wrapper';


@Component({
  selector: 'qli-seed-edit',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss']
})
export class ConfirmDialog extends QubicDialogWrapper{

  public title = this.transloco.translate("confirmDialog.title")
  public message = this.transloco.translate("confirmDialog.confirmationText")
  public cancel = this.transloco.translate("confirmDialog.buttons.cancel")
  public confirm = this.transloco.translate("confirmDialog.buttons.confirm")

  constructor(renderer: Renderer2, themeService: ThemeService, @Inject(MAT_DIALOG_DATA) public data: any, private walletService: WalletService, dialog: Dialog, private fb: FormBuilder, private dialogRef: DialogRef, private _snackBar: MatSnackBar, private transloco: TranslocoService) {
    super(renderer, themeService);
    if (data?.title) {
      this.title = data.title;
    }
    if (data?.message) {
      this.message = data.message;
    }
    if (data?.cancel) {
      this.cancel = data.cancel;
    }
    if (data?.confirm) {
      this.confirm = data.confirm;
    }
  }
}
