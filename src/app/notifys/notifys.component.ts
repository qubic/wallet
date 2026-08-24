import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { WalletService } from '../services/wallet.service';
import {MatDialog} from '@angular/material/dialog';
import { LockConfirmDialog } from '../lock/confirm-lock/confirm-lock.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@ngneat/transloco';
import { ExportConfigDialog } from '../lock/export-config/export-config.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';


@Component({
  selector: 'qli-notifys',
  templateUrl: './notifys.component.html',
  styleUrls: ['./notifys.component.scss']
})
export class NotifysComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();
  private vaultSaverAcive = false;

  constructor(private cd: ChangeDetectorRef, public walletService: WalletService, public dialog: MatDialog, private transloco: TranslocoService, private _snackBar: MatSnackBar){

  }
  ngOnInit(): void {
    this.walletService.onConfig
      .pipe(takeUntil(this.destroy$))
      .subscribe(s => {
        if(this.hasUnsavedSeeds()) {
          this.saveSettings(true);
        }
        this.cd.detectChanges();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  hasUnsavedSeeds(){
    return this.walletService.getSeeds().find(f => !f.isExported);
  }

  saveSettings(force = false): void {
    if(!this.vaultSaverAcive){
      this.vaultSaverAcive = true;
      this.dialog.open(ExportConfigDialog, {disableClose: force}).afterClosed().subscribe(s => {
        this.vaultSaverAcive = false;
      });
    }
  }

  lock(): void {
    const dialogRef = this.dialog.open(LockConfirmDialog, {restoreFocus: false});

    // Manually restore focus to the menu trigger since the element that
    // opens the dialog won't be in the DOM any more when the dialog closes.
    dialogRef.afterClosed().subscribe(() => {
      // do anything :)
    });
  }
 
}
