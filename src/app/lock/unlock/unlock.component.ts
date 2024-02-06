import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectorRef, Component, Injector, Renderer2 } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { WalletService } from 'src/app/services/wallet.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LockConfirmDialog } from '../confirm-lock/confirm-lock.component';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from 'src/app/core/confirm-dialog/confirm-dialog.component';
import { TranslocoService } from '@ngneat/transloco';
import { ThemeService } from 'src/app/services/theme.service';
import { QubicDialogWrapper } from 'src/app/core/dialog-wrapper/dialog-wrapper';


@Component({
  selector: 'qli-unlock',
  templateUrl: './unlock.component.html',
  styleUrls: ['./unlock.component.scss']
})
export class UnLockComponent extends QubicDialogWrapper {

  public file: File | null = null;
  public newUser = false;
  public pwdWrong = false;

  importForm = this.fb.group({
    password: [null, [Validators.required, Validators.minLength(8)]],
  });

  dialogRef: DialogRef | null = null;

  constructor(renderer: Renderer2, themeService: ThemeService, public walletService: WalletService, private transloco: TranslocoService, private cdr: ChangeDetectorRef, private fb: FormBuilder, private dialog: MatDialog, private _snackBar: MatSnackBar, private injector: Injector) {
    super(renderer, themeService);
    this.dialogRef = injector.get(DialogRef, null)
    this.newUser = this.walletService.getSeeds().length <= 0 && !this.walletService.publicKey;
  }

  onPasswordChange() {
    this.pwdWrong = false; 
  }
  

  isNewUser() {
    return this.newUser;
  }
  toggleNewUser(v:boolean) {
    this.newUser = v;
    this.cdr.detectChanges();
  }

  startCreateProcess() {
    this.walletService.clearConfig();
    this.walletService.createNewKeys();
    this.toggleNewUser(false);
    const lockRef = this.dialog.open(LockConfirmDialog, {
      restoreFocus: false, data: {
        command: "keyDownload"
      }
    });

    // Manually restore focus to the menu trigger since the element that
    // opens the dialog won't be in the DOM any more when the dialog closes.
    lockRef.afterClosed().subscribe(() => {
      // do anything :)
      this.dialogRef?.close();
    });
  }

  gengerateNew() {
    if(this.walletService.getSeeds().length > 0 || this.walletService.publicKey){
      const confirmDialo = this.dialog.open(ConfirmDialog, { restoreFocus: false, data: {
        message: this.transloco.translate("unlockComponent.overwriteVault")
      } });
      confirmDialo.afterClosed().subscribe(result => {
        if (result) {
          this.startCreateProcess();
        }
      })
    }else{
      this.startCreateProcess();
    }

    
   
  }

  lock() {

    this.dialogRef?.close();
    
    const dialogRef = this.dialog.open(LockConfirmDialog, { restoreFocus: false });

    // Manually restore focus to the menu trigger since the element that
    // opens the dialog won't be in the DOM any more when the dialog closes.
    dialogRef.afterClosed().subscribe(() => {
    
    });
  }

  unlock() {
    if (this.importForm.valid && this.importForm.controls.password.value && this.file) {
      this.file.arrayBuffer().then(b => {        
        this.pwdWrong = true;
        this.walletService.unlock(b, (<any>this.importForm.controls.password.value)).then(r => {
          if (r) {
            this.pwdWrong = false;
            this.walletService.isWalletReady = true;
            this.dialogRef?.close();
          } else {
            this._snackBar.open("Import Failed", "close", {
              duration: 5000,
              panelClass: "error"
            });
          }
        });
      }).catch(r => {
        this._snackBar.open("Import Failed (passord or file do not match)", "close", {
          duration: 5000,
          panelClass: "error"
        });
      });
    } else {
      this.importForm.markAsTouched();
      this.importForm.controls.password.markAllAsTouched();
    }
  }

  onSubmit(event: any): void {
    event.stopPropagation();
    event.preventDefault();
    this.unlock();
  }


  onFileSelected(event: any): void {
    this.file = event?.target.files[0];
  }


}
