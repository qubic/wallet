import { Component } from '@angular/core';
import { WalletService } from 'src/app/services/wallet.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@ngneat/transloco';
import { NgxFileDropEntry } from 'ngx-file-drop';
import { IConfig } from '../../model/config';
import { DeviceDetectorService } from 'ngx-device-detector';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from 'src/app/core/confirm-dialog/confirm-dialog.component';
import { FormBuilder, FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-settings-general',
  templateUrl: './general.component.html',
  styleUrls: ['./general.component.scss']
})
export class SettingsGeneralComponent {

  public fileError: string = "";
  public configToImport: IConfig | undefined;
  public isMobile = false;
  public importDone = false;

  form = this.fb.group({
    tickAddition: [10],
    useBridge: [false],
    enableBeta: [false],
  });

  constructor (private walletService: WalletService, private fb: FormBuilder, public dialog: MatDialog,  private _snackBar: MatSnackBar, private transloco: TranslocoService, private deviceService: DeviceDetectorService){
    this.isMobile = deviceService.isMobile();

    const settings = this.walletService.getSettings();

    this.form.controls.tickAddition.setValue(settings.tickAddition);
    this.form.controls.useBridge.setValue(settings.useBridge);
    this.form.controls.enableBeta.setValue(settings.enableBeta);
  }

  public getWebBridges(): string[]{
    return this.walletService.getWebBridges();
  }

  public onSubmit(){
    this.walletService.updateConfig({
      useBridge: this.form.controls.useBridge.value,
      tickAddition: this.form.controls.tickAddition.value,
      enableBeta: this.form.controls.enableBeta.value
    });
  }

}
