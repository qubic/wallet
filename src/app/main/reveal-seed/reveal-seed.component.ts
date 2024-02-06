import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectorRef, Component, Inject, Renderer2 } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { WalletService } from 'src/app/services/wallet.service';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { IDecodedSeed, ISeed } from 'src/app/model/seed';
import { QubicHelper } from 'qubic-ts-library/dist//qubicHelper';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UnLockComponent } from 'src/app/lock/unlock/unlock.component';
import { ThemeService } from 'src/app/services/theme.service';
import { QubicDialogWrapper } from 'src/app/core/dialog-wrapper/dialog-wrapper';


@Component({
  selector: 'qli-reveal-seed',
  templateUrl: './reveal-seed.component.html',
  styleUrls: ['./reveal-seed.component.scss']
})
export class RevealSeedDialog extends QubicDialogWrapper {
  public s = '';
  constructor(renderer: Renderer2, themeService: ThemeService, @Inject(MAT_DIALOG_DATA) public data: any, chgd: ChangeDetectorRef, private walletService: WalletService, dialog: Dialog, private fb: FormBuilder, private dialogRef: DialogRef, private _snackBar: MatSnackBar) {
    super(renderer, themeService);
    this.walletService.revealSeed(data.publicId).then(s => {
      this.s = s;
      chgd.detectChanges();
    });
  }


}
