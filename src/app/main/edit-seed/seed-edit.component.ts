import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { Component, Inject, Renderer2 } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { WalletService } from 'src/app/services/wallet.service';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { IDecodedSeed, ISeed } from 'src/app/model/seed';
import { QubicHelper } from 'qubic-ts-library/dist//qubicHelper';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UnLockComponent } from 'src/app/lock/unlock/unlock.component';
import { TranslocoService } from '@ngneat/transloco';
import { ThemeService } from 'src/app/services/theme.service';
import { QubicDialogWrapper } from 'src/app/core/dialog-wrapper/dialog-wrapper';


@Component({
  selector: 'qli-seed-edit',
  templateUrl: './seed-edit.component.html',
  styleUrls: ['./seed-edit.component.scss']
})
export class SeedEditDialog extends QubicDialogWrapper {

  seedEditForm = this.fb.group({
    alias: ["Seed " + (this.walletService.getSeeds().length + 1), [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    seed: ['', [Validators.required, Validators.minLength(55), Validators.maxLength(55), Validators.pattern('[a-z]*')]],
    publicId: ['', [Validators.required, Validators.minLength(60), Validators.maxLength(60), Validators.pattern('[A-Z]*')]],
  });

  isNew = true;
  seed: IDecodedSeed = (<IDecodedSeed>{});

  constructor(renderer: Renderer2, themeService: ThemeService, @Inject(MAT_DIALOG_DATA) public data: any, public walletService: WalletService, dialog: Dialog, private fb: FormBuilder, private dialogRef: DialogRef, private _snackBar: MatSnackBar, private transloco: TranslocoService) {
    super(renderer, themeService);

    if (data.publicId) {
      this.seed = (<any>this.walletService.getSeed(data.publicId));
      this.isNew = false;
    }

    this.seedEditForm.controls.seed.valueChanges.subscribe(v => {
      this.generateIds(v!);
    });

    this.init();
  }

  init() {
    if (this.isNew) {
      this.seedEditForm.controls.alias.setValue(this.transloco.translate("seedEditComponent.newSeedName") + " " + (this.walletService.getSeeds().length + 1));
    } else {
      this.seedEditForm.controls.alias.setValue(this.seed.alias);
      this.seedEditForm.controls.publicId.setValue(this.seed.publicId);
      this.seedEditForm.controls.publicId.clearValidators();
      this.seedEditForm.controls.seed.clearValidators();
    }
  }

  getPublicId(): string {
    return this.seed?.publicId ?? this.seedEditForm.controls.publicId.value ?? '';
  }

  onSubmit(): void {
    this.saveSeed();

  }

  async saveSeed() {
    if (this.seedEditForm.valid) {
      if (!this.isNew) {
        this.walletService.updateSeedAlias(this.seed.publicId, this.seedEditForm.controls.alias.value!)
      } else {
        this.seed.alias = this.seedEditForm.controls.alias.value!;
        this.generateIds(this.seedEditForm.controls.seed.value!);
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
    new QubicHelper().createIdPackage(seed).then((response: { publicKey: Uint8Array, publicId: string }) => {
      this.seedEditForm.controls.publicId.setValue(response.publicId);
      this.seed.publicId = response.publicId;
      //this.seed.publicKey = response.publicKey;
      this.seed.seed = seed;
    });
  }

  generateSeed(): void {
    const seed = this.seedGen();
    this.seedEditForm.controls.seed.setValue(seed);
    //this.generateIds(seed);
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

}
