import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectorRef, Component, Inject, Renderer2 } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { WalletService } from 'src/app/services/wallet.service';
import {MatDialog, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { IDecodedSeed, ISeed } from 'src/app/model/seed';
import { QubicHelper } from '@qubic-lib/qubic-ts-library/dist//qubicHelper';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UnLockComponent } from 'src/app/lock/unlock/unlock.component';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ThemeService } from 'src/app/services/theme.service';
import { QubicDialogWrapper } from 'src/app/core/dialog-wrapper/dialog-wrapper';


@Component({
  selector: 'qli-qr-receive',
  templateUrl: './qr-receive.component.html',
  styleUrls: ['./qr-receive.component.scss']
})
export class QrReceiveDialog extends QubicDialogWrapper {

  public qrCode: string = "";
  public qrCodeDownloadLink: SafeUrl = "";
  
  constructor(renderer: Renderer2,  themeService: ThemeService, @Inject(MAT_DIALOG_DATA) public data: any, chgd: ChangeDetectorRef, private walletService: WalletService, dialog: Dialog, private fb: FormBuilder, private dialogRef: DialogRef,private _snackBar: MatSnackBar) {
    super(renderer, themeService);
    this.qrCode = 'https://wallet.qubic.org/payment/' + data.publicId
  }

  onChangeURL(url: SafeUrl) {
    this.qrCodeDownloadLink = url;
  }

}
