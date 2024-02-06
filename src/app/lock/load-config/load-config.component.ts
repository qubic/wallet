import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectorRef, Component, Inject, Renderer2 } from '@angular/core';
import { FormBuilder,  } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslocoService } from '@ngneat/transloco';
import { QubicDialogWrapper } from 'src/app/core/dialog-wrapper/dialog-wrapper';
import { ThemeService } from 'src/app/services/theme.service';
import { WalletService } from 'src/app/services/wallet.service';
import { IConfig } from '../../model/config';
import { NgxFileDropEntry } from 'ngx-file-drop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from 'src/app/core/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'qli-load-config',
  templateUrl: './load-config.component.html',
  styleUrls: ['./load-config.component.scss']
})
export class LoadConfigDialog extends QubicDialogWrapper{
  
  public fileError: string = "";
  public configToImport: IConfig | undefined;
  public isMobile = true;
  public importDone = false;


  constructor(renderer: Renderer2, themeService: ThemeService, @Inject(MAT_DIALOG_DATA) public data: any, private chdet: ChangeDetectorRef, public walletService: WalletService, public dialog: MatDialog, private fb: FormBuilder, private dialogRef: DialogRef, private transloco: TranslocoService,  private _snackBar: MatSnackBar) {
    super(renderer, themeService);
      

  }

  public import() {
    if(!this.configToImport)
      return;
    const confirmDialog = this.dialog.open(ConfirmDialog, { restoreFocus: false });
    confirmDialog.afterClosed().subscribe(result => {
      if (result) {
        if(!this.walletService.importConfig(this.configToImport!)){
          this._snackBar.open(this.transloco.translate("settings.import.failed"), this.transloco.translate("general.close") , {
            duration: 0,
            panelClass: "error"
          });
        }else {
          this.importDone = true;
          window.location.reload();
        }
      }
    })  
  }

  public dropped(files: NgxFileDropEntry[]) {
    if(files.length !== 1){
      this._snackBar.open(this.transloco.translate("settings.export.onlyOneFile"), this.transloco.translate("general.close") , {
        duration: 0,
        panelClass: "error"
      });
      return;
    }
    //this.file = files[0];
    for (const droppedFile of files) {

      // Is it a file?
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file((file: File) => {

          // analyze file
          file.arrayBuffer().then(b => {
            const enc = new TextDecoder("utf-8");
            const jsonData = enc.decode(b);
            if(jsonData){
              this.configToImport = JSON.parse(jsonData);
              //todo: better type check
              if(!this.configToImport || !this.configToImport.seeds){
                this.configToImport = undefined;
                this._snackBar.open(this.transloco.translate("settings.import.invalidConfig"), this.transloco.translate("general.close"), {
                  duration: 5000,
                  panelClass: "error"
                });
              }
            }
          }).catch(r => {
            this._snackBar.open(this.transloco.translate("settings.import.wrongFile"), this.transloco.translate("general.close"), {
              duration: 5000,
              panelClass: "error"
            });
          });

        });
      }
    }
  }

  close() {
    this.dialogRef.close();
  }

}
