import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { FormBuilder, FormGroup } from '@angular/forms';
import { WalletService } from '../../services/wallet.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from '../../core/confirm-dialog/confirm-dialog.component';
import { TranslocoService } from '@ngneat/transloco';
import { MatTableDataSource } from '@angular/material/table';
import { IStakeStatus, QearnService } from '../../services/qearn.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { lastValueFrom } from 'rxjs';
import { ApiArchiverService } from 'src/app/services/api.archiver.service';

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss'],
})
export class HistoryComponent implements OnInit, AfterViewInit {
  public displayedColumns: string[] = ['lockedEpoch', 'lockedAmount', 'lockedWeeks', 'totalLockedAmountInEpoch', 'currentBonusAmountInEpoch', 'earlyUnlockPercent', 'fullUnlockPercent', 'actions'];
  public dataSource = new MatTableDataSource<IStakeStatus>([]);
  public form: FormGroup;

  constructor(
    private dialog: MatDialog,
    private transloco: TranslocoService,
    public qearnService: QearnService,
    private walletService: WalletService,
    private _snackBar: MatSnackBar,
    private apiArchiver: ApiArchiverService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      sourceId: [''],
    });
  }
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit() {
    this.setupSourceIdValueChange();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  private setupSourceIdValueChange(): void {
    this.form.controls['sourceId'].valueChanges.subscribe((s) => {
      if (s) {
        this.dataSource.data = this.qearnService.stakeData[s];
      }
    });
  }

  public getSeeds() {
    return this.walletService.getSeeds();
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  openEarlyUnlockModal(element: IStakeStatus): void {
    if (!this.walletService.privateKey) {
      this._snackBar.open(this.transloco.translate('qearn.history.pleaseUnlock'), this.transloco.translate('general.close'), {
        duration: 5000,
        panelClass: 'error',
      });
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialog, {
      restoreFocus: false,
      data: {
        title: this.transloco.translate('qearn.history.unlock.title'),
        message: this.transloco.translate('qearn.history.unlock.message'),
        confirm: this.transloco.translate('qearn.history.unlock.confirm'),
      },
    });
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        this.handleUnlockAction(element);
      }
    });
  }

  private async handleUnlockAction(element: IStakeStatus) {
    try {
      const tick = await lastValueFrom(this.apiArchiver.getCurrentTick());
      const seed = await this.walletService.revealSeed(element.publicId);
      const unlockResult = await this.qearnService.unLockQubic(seed, element.lockedAmount, element.lockedEpoch, tick);
      if (unlockResult) {
        this._snackBar.open(this.transloco.translate('qearn.history.unlock.success'), this.transloco.translate('general.close'), {
          duration: 3000,
          panelClass: 'success',
        });
      }
    } catch (error) {
      this._snackBar.open(this.transloco.translate('qearn.history.unlock.error'), this.transloco.translate('general.close'), {
        duration: 3000,
        panelClass: 'error',
      });
    }
  }
}
