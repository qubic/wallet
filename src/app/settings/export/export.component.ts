import { Component } from '@angular/core';
import { WalletService } from 'src/app/services/wallet.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@ngneat/transloco';
import { NgxFileDropEntry } from 'ngx-file-drop';
import { IConfig } from '../../model/config';
import { DeviceDetectorService } from 'ngx-device-detector';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from 'src/app/core/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-export',
  templateUrl: './export.component.html',
  styleUrls: ['./export.component.scss']
})
export class ExportComponent {

  public fileError: string = "";
  public configToImport: IConfig | undefined;
  public isMobile = true;
  public importDone = false;

  constructor (private walletService: WalletService, public dialog: MatDialog,  private _snackBar: MatSnackBar, private transloco: TranslocoService, private deviceService: DeviceDetectorService){

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

  public export() {
    if(!this.walletService.exportConfig()){
      this._snackBar.open(this.transloco.translate("settings.export.noData"), this.transloco.translate("general.close") , {
        duration: 0,
        panelClass: "error"
      });
    }
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
}
