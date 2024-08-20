import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { WalletService } from '../../services/wallet.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from '../../core/confirm-dialog/confirm-dialog.component';
import { TranslocoService } from '@ngneat/transloco';
import { MatTableDataSource } from '@angular/material/table';
import { QearnService } from '../../services/qearn.service';
import { REWARD_DATA } from '../reward-table/table-data';
import { MatSnackBar } from '@angular/material/snack-bar';
import { lastValueFrom } from 'rxjs';
import { ApiArchiverService } from 'src/app/services/api.archiver.service';
import { PublicKey } from 'qubic-ts-library/dist/qubic-types/PublicKey';

export interface IStakeStatus {
  publicId: string;
  lockedEpoch: number;
  lockedAmount: bigint;
  lockedWeeks: number;
  totalLockedAmountInEpoch: bigint;
  currentBonusAmountInEpoch: bigint;
  earlyUnlockPercent: number;
  fullUnlockPercent: number;
}

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss'],
})
export class HistoryComponent implements OnInit, AfterViewInit {
  public displayedColumns: string[] = ['lockedEpoch', 'lockedAmount', 'lockedWeeks', 'totalLockedAmountInEpoch', 'currentBonusAmountInEpoch', 'earlyUnlockPercent', 'fullUnlockPercent', 'actions'];
  public dataSource = new MatTableDataSource<IStakeStatus>([]);
  public stakeData: { [key: string]: IStakeStatus[] } = {};
  public isLoading = false;
  public form: FormGroup;

  constructor(
    private dialog: MatDialog,
    private transloco: TranslocoService,
    private qearnService: QearnService,
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
        this.fetchData(s);
      }
    });
  }

  public getSeeds() {
    return this.walletService.getSeeds();
  }

  public async fetchData(publicId: string) {
    this.isLoading = true;
    const pubKey = new PublicKey(publicId).getPackageData();
    for (let idx = 0; idx < 52; idx++) {
      const { bonusAmount, lockAmount: totalLockedAmount } = await this.qearnService.getLockInfoPerEpoch(122 - idx);
      const lockAmount = await this.qearnService.getUserLockInfo(pubKey, 122 - idx);
      if (lockAmount) {
        const earlyUnlockPercent = REWARD_DATA.find((f) => f.weekFrom <= idx && f.weekTo > idx)?.earlyUnlock!;

        if (!this.stakeData[publicId]) {
          this.stakeData[publicId] = [];
        }

        const existingData = this.stakeData[publicId].find((data) => data.lockedEpoch === 122 - idx);
        if (!existingData) {
          this.stakeData[publicId].push({
            publicId: publicId,
            lockedEpoch: 122 - idx,
            lockedAmount: lockAmount,
            lockedWeeks: idx,
            totalLockedAmountInEpoch: totalLockedAmount,
            currentBonusAmountInEpoch: bonusAmount,
            earlyUnlockPercent,
            fullUnlockPercent: 100,
          });
        }
      }
    }
    const allData: IStakeStatus[] = Object.values(this.stakeData).flat();
    this.dataSource.data = allData;
    this.isLoading = false;
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
        try {
          const tick = await lastValueFrom(this.apiArchiver.getCurrentTick());
          const seed = await this.walletService.revealSeed(element.publicId);
          const unlockResult = await this.qearnService.unLockQubic(seed, element.lockedAmount, element.lockedEpoch, tick);
          if (unlockResult) {
            this._snackBar.open(this.transloco.translate('qearn.history.unlock.success'), this.transloco.translate('general.close'), {
              duration: 3000, // Duration in milliseconds
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
    });
  }

  removeElement(element: IStakeStatus): void {
    const index = this.dataSource.data.indexOf(element);
    if (index > -1) {
      this.dataSource.data.splice(index, 1);
      this.dataSource._updateChangeSubscription(); // Refresh the table
    }
  }
}
