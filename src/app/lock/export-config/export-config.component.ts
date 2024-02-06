import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectorRef, Component, Inject, Renderer2 } from '@angular/core';
import { FormBuilder,  } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslocoService } from '@ngneat/transloco';
import { QubicDialogWrapper } from 'src/app/core/dialog-wrapper/dialog-wrapper';
import { ThemeService } from 'src/app/services/theme.service';
import { WalletService } from 'src/app/services/wallet.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'qli-export-config',
  templateUrl: './export-config.component.html',
  styleUrls: ['./export-config.component.scss']
})
export class ExportConfigDialog extends QubicDialogWrapper{
  
  public isMobile = true;

  constructor(renderer: Renderer2, themeService: ThemeService, @Inject(MAT_DIALOG_DATA) public data: any, private chdet: ChangeDetectorRef, public walletService: WalletService, public dialog: MatDialog, private fb: FormBuilder, private dialogRef: DialogRef, private transloco: TranslocoService,  private _snackBar: MatSnackBar) {
    super(renderer, themeService);      

  }

  public export() {
    if(!this.walletService.exportConfig()){
      this._snackBar.open(this.transloco.translate("settings.export.noData"), this.transloco.translate("general.close") , {
        duration: 0,
        panelClass: "error"
      });
    }
  }

  close() {
    this.dialogRef.close();
  }

}
