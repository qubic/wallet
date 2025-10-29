import { Component, OnDestroy } from '@angular/core';
import { WalletService } from '../services/wallet.service';
import { MatDialog } from '@angular/material/dialog';
import { LockConfirmDialog } from './confirm-lock/confirm-lock.component';
import { UnLockComponent } from './unlock/unlock.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';


@Component({
  selector: 'qli-lock',
  templateUrl: './lock.component.html',
  styleUrls: ['./lock.component.scss']
})
export class LockComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  constructor(public walletService: WalletService, public dialog: MatDialog) {

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public getName() {
    if(this.walletService.getName()){
      return ' ' + this.walletService.getName();
    }
    return '';
  }
  
  lock(): void {
    const dialogRef = this.dialog.open(LockConfirmDialog, { restoreFocus: false });

    // Manually restore focus to the menu trigger since the element that
    // opens the dialog won't be in the DOM any more when the dialog closes.
    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // do anything :)
      });
  }
  unlock(): void {
    const dialogRef = this.dialog.open(UnLockComponent, { restoreFocus: false });

    // Manually restore focus to the menu trigger since the element that
    // opens the dialog won't be in the DOM any more when the dialog closes.
    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // do anything :)
      });
  }
}
