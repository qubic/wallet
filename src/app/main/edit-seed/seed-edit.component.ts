import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { Component, Inject, OnDestroy, Renderer2 } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { WalletService } from 'src/app/services/wallet.service';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { IDecodedSeed, ISeed } from 'src/app/model/seed';
import { QubicHelper } from '@qubic-lib/qubic-ts-library/dist//qubicHelper';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UnLockComponent } from 'src/app/lock/unlock/unlock.component';
import { TranslocoService } from '@ngneat/transloco';
import { ThemeService } from 'src/app/services/theme.service';
import { QubicDialogWrapper } from 'src/app/core/dialog-wrapper/dialog-wrapper';
import { ConfirmDialog } from 'src/app/core/confirm-dialog/confirm-dialog.component';
import { PublicKey } from '@qubic-lib/qubic-ts-library/dist/qubic-types/PublicKey';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';


@Component({
  selector: 'qli-seed-edit',
  templateUrl: './seed-edit.component.html',
  styleUrls: ['./seed-edit.component.scss']
})
export class SeedEditDialog extends QubicDialogWrapper implements OnDestroy {

  private destroy$ = new Subject<void>();

  seedEditForm = this.fb.group({
    alias: ["Seed " + (this.walletService.getSeeds().length + 1), [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    seed: ['', [Validators.required, Validators.minLength(55), Validators.maxLength(55), Validators.pattern('[a-z]*')]],
    publicId: ['', [Validators.required, Validators.minLength(60), Validators.maxLength(60), Validators.pattern('[A-Z]*')]],
    isWatchOnlyAddress: [false],
  });
  seedEditFormPublicId = this.fb.group({
    alias: ["Seed " + (this.walletService.getSeeds().length + 1), [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    publicId: ['', [Validators.required, Validators.minLength(60), Validators.maxLength(60), Validators.pattern('[A-Z]*')]],
  });

  isNew = true;
  seed: IDecodedSeed = (<IDecodedSeed>{});
  public ownSeedModeDeactivated = true;

  constructor(renderer: Renderer2, private matDialog: MatDialog, themeService: ThemeService, @Inject(MAT_DIALOG_DATA) public data: any, public walletService: WalletService, private dialog: Dialog, private fb: FormBuilder, private dialogRef: DialogRef, private _snackBar: MatSnackBar, private transloco: TranslocoService) {
    super(renderer, themeService);

    if (data.publicId) {
      this.seed = (<any>this.walletService.getSeed(data.publicId));
      this.isNew = false;
    }

    this.seedEditForm.controls.seed.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => {
        this.generateIds(v!);
      });

    this.init();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  init() {
    if (this.isNew) {
      this.seedEditForm.controls.alias.setValue(this.transloco.translate("seedEditComponent.newSeedName") + " " + (this.walletService.getSeeds().length + 1));
      this.randomizeSeed();
    } else {
      this.seedEditForm.controls.alias.setValue(this.seed.alias);
      this.seedEditForm.controls.publicId.setValue(this.seed.publicId);
      this.seedEditForm.controls.publicId.clearValidators();
      this.seedEditFormPublicId.controls.publicId.setValue(this.seed.publicId);
      this.seedEditFormPublicId.controls.publicId.clearValidators();
      this.seedEditForm.controls.seed.clearValidators();
    }
    this.seedEditForm.controls.isWatchOnlyAddress.setValue(this.seed.isOnlyWatch!);
  }

  getPublicId(): string {
    return this.seedEditForm.controls.alias.valid && this.seedEditForm.controls.publicId.value ? this.seed?.publicId : '';
  }

  async onSubmit() {
    // Is the Publicid already present in the accounts?
    if (this.isNew) {     
      if (this.walletService.getSeeds().filter(s =>
        s.publicId === this.seedEditForm.controls.publicId.value ||
        s.publicId === this.seedEditFormPublicId.controls.publicId.value
      ).length > 0) {
        this._snackBar.open(this.transloco.translate("seedEditComponent.form.error.publicIdAvailable"), this.transloco.translate("seedEditComponent.form.error.close"), {
          duration: 5000,
          panelClass: "error"
        });
        return;
      }
    }

    if (this.seedEditForm.controls.isWatchOnlyAddress.value) {
      this.saveOnlyPublicKey();
    } else {
      this.saveSeed();
    }
  }

  async saveSeed() {
    if (this.seedEditForm.valid) {
      if (!this.isNew) {
        this.walletService.updateSeedAlias(this.seed.publicId, this.seedEditForm.controls.alias.value!)
        this.walletService.updateSeedIsOnlyWatch(this.seed.publicId, this.seedEditForm.controls.isWatchOnlyAddress.value!)
      } else {
        this.seed.isOnlyWatch = this.seedEditForm.controls.isWatchOnlyAddress.value!;
        this.seed.alias = this.seedEditForm.controls.alias.value!;
        this.generateIds(this.seedEditForm.controls.seed.value!);
        await this.walletService.addSeed(this.seed);
      }
      this.dialogRef.close();
    } else {
      this._snackBar.open(this.transloco.translate("seedEditComponent.form.error.text"), this.transloco.translate("seedEditComponent.form.error.close"), {
        duration: 10000,
        panelClass: "error"
      });
    }
  }

  async saveOnlyPublicKey() {
    const targetAddress = new PublicKey(this.seedEditFormPublicId.controls.publicId.value?.toString());
    // verify target address
    if (!(await targetAddress.verifyIdentity())) {
      this._snackBar.open("INVALID ADDRESS", this.transloco.translate('general.close'), {
        duration: 10000,
        panelClass: "error"
      });
      return;
    }

    if (this.seedEditFormPublicId.controls.alias.valid && this.seedEditFormPublicId.controls.publicId.valid) {
      if (!this.isNew) {
        this.walletService.updateSeedAlias(this.seed.publicId, this.seedEditForm.controls.alias.value!)
        this.walletService.updateSeedIsOnlyWatch(this.seed.publicId, this.seedEditForm.controls.isWatchOnlyAddress.value!)
      } else {
        this.seed.isOnlyWatch = this.seedEditForm.controls.isWatchOnlyAddress.value!;
        this.seed.alias = this.seedEditForm.controls.alias.value!;
        this.seed.publicId = this.seedEditFormPublicId.controls.publicId.value!;
        this.seed.seed = '';
        await this.walletService.addSeed(this.seed);
      }
      this.dialogRef.close();
    } else {
      this._snackBar.open(this.transloco.translate("seedEditComponent.form.error.text"), this.transloco.translate("seedEditComponent.form.error.close"), {
        duration: 5000,
        panelClass: "error"
      });
    }
  }

  generateIds(seed: string): void {
    if (seed && seed.length == 55) {
      new QubicHelper().createIdPackage(seed).then((response: { publicKey: Uint8Array, publicId: string }) => {
        this.seedEditForm.controls.publicId.setValue(response.publicId);
        this.seed.publicId = response.publicId;
        //this.seed.publicKey = response.publicKey;
        this.seed.seed = seed;
      })
    } else {
      this.seedEditForm.controls.publicId.setValue('');
      this.seed.publicId = '';
      this.seed.seed = '';
    }
  }

  toggleWatchOnlyAddress(): void {
    if (this.seedEditForm.controls.isWatchOnlyAddress.value) {
      this.seedEditForm.controls.seed.setValue("");
      this.ownSeedModeDeactivated = true;
    } else {
      this.ownSeedModeDeactivated = false;
      this.randomizeSeed();
    }
  }

  randomizeSeed(): void {
    this.ownSeedModeDeactivated = true;
    this.seedEditForm.controls.seed.setValue(this.seedGen());
  }

  public insertSeed() {
    navigator.clipboard.readText().then(clipText => {
      this.seedEditForm.controls.seed.setValue(clipText);
    });    
  }

  public resetSeed() {
    const confirmDialog = this.matDialog.open(ConfirmDialog, {
      restoreFocus: false,
      data: {
        message: this.transloco.translate('ownSeedWarningDialog.message'),
      },
    });
    confirmDialog.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.ownSeedModeDeactivated = false;
          this.seedEditForm.controls.seed.setValue("");
          const seedValue = this.seedEditForm.controls.seed.value || "";
          this.generateIds(seedValue);
        }
      })
  }

  seedGen(): string {
    const letters = "abcdefghijklmnopqrstuvwxyz";
    const letterSize = letters.length;
    let seed = "";
    for (let i = 0; i < 55; i++) {
      seed += letters[Math.floor(Math.random() * letterSize)];
    }
    return seed;
  }

  copyPublicId() {
    navigator.clipboard.writeText(this.seedEditForm.controls.publicId.value!);
  }

  loadKey() {
    this.dialogRef.close();
    window.setTimeout(() => {
      this.dialog.open(UnLockComponent);
    }, 500);
  }
}
