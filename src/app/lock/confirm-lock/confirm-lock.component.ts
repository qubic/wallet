import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectorRef, Component, Inject, Renderer2 } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { TranslocoService } from '@ngneat/transloco';
import { QubicDialogWrapper } from 'src/app/core/dialog-wrapper/dialog-wrapper';
import { ThemeService } from 'src/app/services/theme.service';
import { WalletService } from 'src/app/services/wallet.service';
import { OkDialog } from 'src/app/core/ok-dialog/ok-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

@Component({
  selector: 'qli-lock-confirm',
  templateUrl: './confirm-lock.component.html',
  styleUrls: ['./confirm-lock.component.scss']
})
export class LockConfirmDialog extends QubicDialogWrapper {

  public showSave: boolean = false;

  exportForm = this.fb.group({
    password: [null, [Validators.required, Validators.minLength(8)]],
  });

  public keyDownload = false;
  public isVaultFileExported = false; // is set to true as soon the vault file has been exported/downloaded

  constructor(renderer: Renderer2, private _snackBar: MatSnackBar, private router: Router, themeService: ThemeService, @Inject(MAT_DIALOG_DATA) public data: any, private chdet: ChangeDetectorRef, public walletService: WalletService, private dialog: MatDialog, private fb: FormBuilder, private dialogRef: DialogRef, private transloco: TranslocoService) {
    super(renderer, themeService);
    if (data && data.command && data.command == "keyDownload") {
      this.keyDownload = true;
    }
  }

  toggleShowSave() {
    if (this.showSave) {
      this.showSave = false;
    } else {
      this.showSave = true;
    }
    this.chdet.detectChanges();
  }

  async exportVault(showConfirmation = true, closeDialog = true): Promise<boolean> {
    if (this.exportForm.valid && this.exportForm.controls.password.value) {
      
      try{
      await this.walletService.exportVault(this.exportForm.controls.password.value)
      
      
        this.isVaultFileExported = true;

        if(closeDialog)
          this.dialogRef.close();

        if(showConfirmation && !this.showSave){
          const dialogRef = this.dialog.open(OkDialog, {
            data: { 
              title: this.transloco.translate("okDialog.title"), 
              message: this.transloco.translate("okDialog.messages.tresorText"), 
              button: this.transloco.translate("okDialog.button") 
            },
          });
        }
        return true;
      } catch(e) {
        console.error(e);
        this._snackBar.open("Export failed", "close", {
          duration: 5000,
          panelClass: "error"
        });
      };

      
    }

    return false;
  }

  onSubmit(): void {
   this.exportVault();
  }

  async closeWallet() {
    this.walletService.isWalletReady = false;
    await this.walletService.lock();
    this.dialogRef.close();
    this.router.navigate(['/unlock']);
  }

  async saveAndCloseWallet() {
    if(await this.exportVault(false, false))
      this.closeWallet();
  }
}
