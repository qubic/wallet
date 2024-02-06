import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { Component, Inject, Renderer2 } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { WalletService } from 'src/app/services/wallet.service';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@ngneat/transloco';
import { ThemeService } from 'src/app/services/theme.service';
import { QubicDialogWrapper } from '../dialog-wrapper/dialog-wrapper';

@Component({
  selector: 'qli-ok-dialog',
  templateUrl: './ok-dialog.component.html',
  styleUrls: ['./ok-dialog.component.scss']
})
export class OkDialog extends QubicDialogWrapper{

  public title = this.transloco.translate("okDialog.title");
  public message = "null";
  public button =this.transloco.translate("okDialog.buttons.confirm");

  // constructor(renderer: Renderer2, themeService: ThemeService, @Inject(MAT_DIALOG_DATA) public data: any, private walletService: WalletService, dialog: Dialog, private fb: FormBuilder, private dialogRef: DialogRef, private _snackBar: MatSnackBar, private transloco: TranslocoService) {
  //   super(renderer, themeService);

  //   if (data?.title) {
  //     this.title = data.title;
  //   }
  //   if (data?.message) {
  //     this.message = data.message;
  //   }
  //   if (data?.title) {
  //     this.button = data.button;
  //   }
  // }

  constructor(renderer: Renderer2, themeService: ThemeService, @Inject(MAT_DIALOG_DATA) public data: any, public dialogRef: DialogRef, private transloco: TranslocoService
  ) {
     super(renderer, themeService);

     if (data?.title) {
          this.title = data.title;
        }
        if (data?.message) {
          this.message = data.message;
        }
        if (data?.title) {
          this.button = data.button;
        }
  }

}
