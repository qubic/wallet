import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectorRef, Component, Inject, Renderer2 } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { WalletService, Seed } from 'src/app/services/wallet.service';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { IDecodedSeed, ISeed } from 'src/app/model/seed';
import { QubicHelper } from 'qubic-ts-library/dist//qubicHelper';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UnLockComponent } from 'src/app/lock/unlock/unlock.component';
import { ThemeService } from 'src/app/services/theme.service';
import { QubicDialogWrapper } from 'src/app/core/dialog-wrapper/dialog-wrapper';
import { count } from 'rxjs';


@Component({
  selector: 'qli-reveal-seed',
  templateUrl: './reveal-seed.component.html',
  styleUrls: ['./reveal-seed.component.scss']
})
export class RevealSeedDialog extends QubicDialogWrapper {
  public s = '';
  public addressAlias = '';
  public categorizedSeeds: {
    strongSeeds: { publicKey: string, log: string, isRandomSeed: boolean }[],
    okaySeeds: { publicKey: string, log: string, detailsOkay: { sequence: string, indices: number[] }[], isRandomSeed: boolean }[],
    weakSeeds: { publicKey: string, log: string, details: { sequence: string, indices: number[] }[], isRandomSeed: boolean }[],
    badSeeds: { publicKey: string, log: string, pattern: string, isRandomSeed: boolean }[]
  } = {
      strongSeeds: [],
      okaySeeds: [],
      weakSeeds: [],
      badSeeds: []
    };

  constructor(renderer: Renderer2, themeService: ThemeService, @Inject(MAT_DIALOG_DATA) public data: any, chgd: ChangeDetectorRef, private walletService: WalletService, dialog: Dialog, private fb: FormBuilder, private dialogRef: DialogRef, private _snackBar: MatSnackBar) {
    super(renderer, themeService);

    this.walletService.revealSeed(data.publicId).then(s => {
      this.s = s;
      const seeds: Seed[] = [
        { seed: s, publicKey: data.publicId },
      ];
      this.categorizedSeeds = this.walletService.categorizeSeeds(seeds);
      chgd.detectChanges();
    });

    this.addressAlias = this.walletService.getSeed(data.publicId)?.alias ?? '';
  }

  isRandomSeed(publicId: string) {
    if (this.categorizedSeeds.strongSeeds.some(seed => seed.publicKey === publicId)) {
      return true;
    }

    const okaySeed = this.categorizedSeeds.okaySeeds.find(seed => seed.publicKey === publicId);
    if (okaySeed) {
      let i = 0;
      okaySeed.detailsOkay.forEach(detail => {
        i+= detail.indices.length;
      });
      return i < 5;
    }

    const weakSeed = this.categorizedSeeds.weakSeeds.find(seed => seed.publicKey === publicId);
    if (weakSeed) {
      let i = 0;
      weakSeed.details.forEach(detail => {
        i+= detail.indices.length;
      });
      return i < 5;
    }

    const badSeed = this.categorizedSeeds.badSeeds.find(seed => seed.publicKey === publicId);
    if (badSeed) {
      return false
    }

    return false;
  }

  //return this.walletService.isRandomSeed(seed);
}