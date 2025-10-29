import { Dialog, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectorRef,
  Component,
  Injector,
  OnDestroy,
  Renderer2,
} from '@angular/core';
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
  selector: 'qli-public-unlock',
  templateUrl: './unlock.component.html',
  styleUrls: ['./unlock.component.scss'],
})
export class PublicUnLockComponent extends QubicDialogWrapper implements OnDestroy {
  private destroy$ = new Subject<void>();
  public file: File | null = null;
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
    private injector: Injector
  ) {
    super(renderer, themeService);
    this.dialogRef = injector.get(DialogRef, null);
  }

  onPasswordChange() {
    this.pwdWrong = false;
  }

  public async unlock(): Promise<boolean> {
    if (
      !this.importForm.valid ||
      !this.importForm.controls.password.value ||
      !this.file
    ) {
      this.importForm.markAsTouched();
      this.importForm.controls.password.markAllAsTouched();
      return false;
    }

    let unlockPromise: Promise<Boolean> | undefined;

    const binaryFileData = await this.file?.arrayBuffer();

    if (this.selectedFileIsVaultFile) {
      if (binaryFileData) {
        unlockPromise = this.walletService.unlockVault(
          binaryFileData,
          <any>this.importForm.controls.password.value
        );
      } else {
        this._snackBar.open('Unlock Failed (no file)', 'close', {
          duration: 5000,
          panelClass: 'error',
        });
      }
    } else {
      // legacy
      this.pwdWrong = true;
      unlockPromise = this.walletService.unlock(
        binaryFileData,
        <any>this.importForm.controls.password.value
      );
    }

    if (unlockPromise) {
      try {
        const unlockResult = await unlockPromise;
        if (unlockResult) {
          this.pwdWrong = false;

          // test if the private and public key match
          const seeds = this.walletService.getSeeds();
          let decryptedSeed = '';
          try {
            decryptedSeed = await this.walletService.revealSeed(
              seeds.sort((a, b) => (a.isOnlyWatch ? 1 : 0) - (b.isOnlyWatch ? 1 : 0))[0].publicId
            );
          } catch (e) {
            console.error(e);
          }

          //check only-watch-address
          if (decryptedSeed == '') {
            if (seeds.filter(seed => !seed.isOnlyWatch).length == 0) {
              decryptedSeed = "only-watch"
            }
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
            this.walletService.isWalletReady = true;
            // Use setTimeout to prevent pileup with interval-based calls
            setTimeout(() => this.updaterService.loadCurrentBalance(true), 100);
            this.router.navigate(['/']);
          }
        } else {
          this._snackBar.open('Unlock Failed', 'close', {
            duration: 5000,
            panelClass: 'error',
          });
        }
      } catch (r) {
        console.error(r);
        this._snackBar.open(
          'Unlock Failed (password or file do not match)',
          'close',
          {
            duration: 5000,
            panelClass: 'error',
          }
        );
      }
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
      this.selectedFileIsVaultFile =
        this.walletService.isVaultFile(binaryVaultFile);
    }
  }

  private confirmRedirect(route: string) {
    const confirmDialo = this.dialog.open(ConfirmDialog, {
      restoreFocus: false,
      data: {
        message: this.transloco.translate('unlockComponent.overwriteVault'),
      },
    });
    confirmDialo
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result) {
          this.walletService.clearConfig();
          this.router.navigate([route]);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public importVault() {
    this.confirmRedirect('./import');
  }

  public createNewVault() {
    this.confirmRedirect('./create');
  }
}
