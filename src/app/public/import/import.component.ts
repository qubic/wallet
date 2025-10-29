import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectorRef, Component, Injector, OnDestroy, Renderer2 } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { WalletService } from 'src/app/services/wallet.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from 'src/app/core/confirm-dialog/confirm-dialog.component';
import { TranslocoService } from '@ngneat/transloco';
import { ThemeService } from 'src/app/services/theme.service';
import { QubicDialogWrapper } from 'src/app/core/dialog-wrapper/dialog-wrapper';
import { UpdaterService } from 'src/app/services/updater-service';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';


@Component({
  selector: 'qli-import-vault',
  templateUrl: './import.component.html',
  styleUrls: ['./import.component.scss']
})
export class ImportVaultComponent extends QubicDialogWrapper implements OnDestroy {
  private destroy$ = new Subject<void>();

  public file: File | null = null;
  public selectedConfigFile: File | null = null;
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
        private router: Router, 
        private injector: Injector) {
    super(renderer, themeService);
    this.dialogRef = injector.get(DialogRef, null)
    this.newUser = this.walletService.getSeeds().length <= 0 && !this.walletService.publicKey;
  }

  onPasswordChange() {
    this.pwdWrong = false;
  }

  onEnterKeyPressed() {
    console.log('Enter key pressed!');
    this.checkImportAndUnlock();
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
          // Use setTimeout to prevent pileup with interval-based calls
          setTimeout(() => this.updaterService.loadCurrentBalance(true), 100);
          this.router.navigate(['/']);
        } else {
          this._snackBar.open("Import Failed (password or file do not match)", "close", {
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
      const binaryFileData = await this.selectedConfigFile?.arrayBuffer();
      if (binaryFileData) {
        const enc = new TextDecoder("utf-8");
        const jsonData = enc.decode(binaryFileData);
        if (jsonData) {
          const config = JSON.parse(jsonData);

          // import configuration
          if((await this.unlock())){
            // legacy format
            await this.walletService.importConfig(config);
            // Use setTimeout to prevent pileup with interval-based calls
            setTimeout(() => this.updaterService.loadCurrentBalance(true), 100);
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
      confirmDialo.afterClosed()
        .pipe(takeUntil(this.destroy$))
        .subscribe(result => {
          if (result) {
            // start import
            this.importAndUnlock();
          }
        });
    } else {
      this.importAndUnlock();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
      await unlockPromise.then(r => {
        if (r) {
          this.pwdWrong = false;
          this.walletService.isWalletReady = true;
          // Use setTimeout to prevent pileup with interval-based calls
          setTimeout(() => this.updaterService.loadCurrentBalance(true), 100);
          this.router.navigate(['/']);
        } else {
          this._snackBar.open("Import Failed", "close", {
            duration: 5000,
            panelClass: "error"
          });
        }
      }).catch(r => {
        this._snackBar.open("Import Failed (password or file do not match)", "close", {
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
    console.log("EV", file);
    this.file = file; //event?.target.files[0];
    if (this.file) {
      const binaryVaultFile = await this.file.arrayBuffer();
      this.selectedFileIsVaultFile = this.walletService.isVaultFile(binaryVaultFile);
    }
  }

  async onConfigFileSelected(file: File): Promise<void> {
    this.selectedConfigFile = file;
  }


}
