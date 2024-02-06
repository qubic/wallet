import { DialogRef } from '@angular/cdk/dialog';
import { Component, Injector, Renderer2 } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { WalletService } from 'src/app/services/wallet.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import { ThemeService } from 'src/app/services/theme.service';
import { QubicDialogWrapper } from 'src/app/core/dialog-wrapper/dialog-wrapper';


@Component({
  selector: 'qli-config-error',
  templateUrl: './config-error.component.html',
  styleUrls: ['./config-error.component.scss']
})
export class ConfigErrorComponent extends QubicDialogWrapper {

  public file: File | null = null;

 

  dialogRef: DialogRef | null = null;

  constructor(renderer: Renderer2, themeService: ThemeService, public walletService: WalletService, private fb: FormBuilder, private _snackBar: MatSnackBar, private injector: Injector) {
    super(renderer, themeService);
  }


  resetConfig(): void {
    this.walletService.resetConfig();
  }


}
