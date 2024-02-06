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
import { UpdaterService } from 'src/app/services/updater-service';


@Component({
  selector: 'qli-unlock',
  templateUrl: './unlock.component.html',
  styleUrls: ['./unlock.component.scss']
})
export class UnLockComponent extends QubicDialogWrapper {

  public file: File | null = null;
  public configFile: File | null = null;
  public newUser = false;
  public pwdWrong = false;
  public selectedFileIsVaultFile = false;

  importForm = this.fb.group({
    password: [null, [Validators.required, Validators.minLength(8)]],
  });

  dialogRef: DialogRef | null = null;

  constructor(
        renderer: Renderer2,
        themeService: ThemeService,
        public walletService: WalletService,
        public updaterService: UpdaterService,
        private transloco: TranslocoService,
        private cdr: ChangeDetectorRef,
        private fb: FormBuilder,
        private dialog: MatDialog,
        private _snackBar: MatSnackBar,
        private injector: Injector) {
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
  toggleNewUser(v: boolean) {
    this.newUser = v;
    this.cdr.detectChanges();
  }

  async startCreateProcess() {
    this.walletService.clearConfig();
    await this.walletService.createNewKeys();
    this.toggleNewUser(false);
    const lockRef = this.dialog.open(LockConfirmDialog, {
      restoreFocus: false, closeOnNavigation: false, disableClose: true, data: {
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
    if (this.hasExistingConfig()) {
      const confirmDialo = this.dialog.open(ConfirmDialog, {
        restoreFocus: false, data: {
          message: this.transloco.translate("unlockComponent.overwriteVault")
        }
      });
      confirmDialo.afterClosed().subscribe(result => {
        if (result) {
          this.startCreateProcess();
        }
      })
    } else {
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

  private async importAndUnlock() {
    if (this.selectedFileIsVaultFile) {
      // one vault file
      const binaryFileData = await this.file?.arrayBuffer();
      if (binaryFileData) {
        const success = await this.walletService.importVault(binaryFileData, (<any>this.importForm.controls.password.value));
        if (success) {
          this.pwdWrong = false;
          this.walletService.isWalletReady = true;
          this.updaterService.loadCurrentBalance(true);
          this.dialogRef?.close();
        } else {
          this._snackBar.open("Import Failed (passord or file do not match)", "close", {
            duration: 5000,
            panelClass: "error"
          });
        }
      } else {
        this._snackBar.open("Unlock Failed (no file)", "close", {
          duration: 5000,
          panelClass: "error"
        });
      }
    } else {
      const binaryFileData = await this.configFile?.arrayBuffer();
      if (binaryFileData) {
        const enc = new TextDecoder("utf-8");
        const jsonData = enc.decode(binaryFileData);
        if (jsonData) {
          const config = JSON.parse(jsonData);

          // import configuration
          if((await this.unlock())){
            // legacy format
            await this.walletService.importConfig(config);
            this.updaterService.loadCurrentBalance(true);
          }
        } else {
          this._snackBar.open("Unlock Failed (no file)", "close", {
            duration: 5000,
            panelClass: "error"
          });
        }
      }
    }
  }

  public hasExistingConfig() {
    return this.walletService.getSeeds().length > 0 || this.walletService.publicKey;
  }

  async checkImportAndUnlock() {
    if (this.hasExistingConfig()) {
      const confirmDialo = this.dialog.open(ConfirmDialog, {
        restoreFocus: false, data: {
          message: this.transloco.translate("unlockComponent.overwriteVault")
        }
      });
      confirmDialo.afterClosed().subscribe(result => {
        if (result) {
          // start import
          this.importAndUnlock();
        }
      })
    } else {
      this.importAndUnlock();
    }
  }

  public async unlock(): Promise<boolean> {

    if (!this.importForm.valid || !this.importForm.controls.password.value || !this.file) {
      this.importForm.markAsTouched();
      this.importForm.controls.password.markAllAsTouched();
      return false;
    }

    let unlockPromise: Promise<Boolean> | undefined;

    const binaryFileData = await this.file?.arrayBuffer();

    if (this.selectedFileIsVaultFile) {
      if (binaryFileData) {
        unlockPromise = this.walletService.unlockVault(binaryFileData, (<any>this.importForm.controls.password.value));
      } else {
        this._snackBar.open("Unlock Failed (no file)", "close", {
          duration: 5000,
          panelClass: "error"
        });
      }
    } else {
      // legacy
      this.pwdWrong = true;
      unlockPromise = this.walletService.unlock(binaryFileData, (<any>this.importForm.controls.password.value));

    }

    if (unlockPromise) {
      await unlockPromise.then(async r => {
        if (r) {

          // test if the private and public key match
          const seeds = this.walletService.getSeeds();
          let decryptedSeed = '';
          try {
            decryptedSeed = await this.walletService.revealSeed(
              seeds[0].publicId
            );
          } catch (e) {
            console.error(e);
          }

          if (seeds && seeds.length > 0 && decryptedSeed == '') {
            this._snackBar.open(
              'Unlock Failed: Private- and PublicKey mismatch',
              'close',
              {
                duration: 5000,
                panelClass: 'error',
              }
            );
            this.walletService.lock();
          } else {
            this.pwdWrong = false;
            this.walletService.isWalletReady = true;
            this.updaterService.loadCurrentBalance(true);
            this.dialogRef?.close();
          }


        } else {
          this._snackBar.open("Import Failed", "close", {
            duration: 5000,
            panelClass: "error"
          });
        }
      }).catch(r => {
        this._snackBar.open("Import Failed (passord or file do not match)", "close", {
          duration: 5000,
          panelClass: "error"
        });
      });
      return true;
    }

    return false;
  }

  onSubmit(event: any): void {
    event.stopPropagation();
    event.preventDefault();
    this.unlock();
  }


  async onFileSelected(file: File): Promise<void> {
    this.file = file;
    if (this.file) {
      const binaryVaultFile = await this.file.arrayBuffer();
      this.selectedFileIsVaultFile = this.walletService.isVaultFile(binaryVaultFile);
    }
  }

  async onConfigFileSelected(file: File): Promise<void> {
    this.configFile = file;
  }


}
