import { AfterViewInit, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { FormBuilder, FormGroup } from '@angular/forms';
import { WalletService } from '../../services/wallet.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from '../../core/confirm-dialog/confirm-dialog.component';
import { TranslocoService } from '@ngneat/transloco';
import { MatTableDataSource } from '@angular/material/table';
import { IStakeStatus, QearnService } from '../../services/qearn.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { lastValueFrom, takeUntil, Subject } from 'rxjs';
import { UpdaterService } from 'src/app/services/updater-service';
import { QearnComponent } from '../qearn.component';
import { UnlockInputDialogComponent } from '../components/unlock-input-dialog/unlock-input-dialog.component';
import { ApiLiveService } from 'src/app/services/apis/live/api.live.service';

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss'],
})
export class HistoryComponent implements OnInit, AfterViewInit {
  public displayedColumns: string[] = ['lockedEpoch', 'lockedAmount', 'lockedWeeks', 'totalLockedAmountInEpoch', 'currentBonusAmountInEpoch', 'earlyUnlockPercent', 'fullUnlockPercent', 'actions'];
  public endedColumns: string[] = ['status', 'unLockedAmount', 'rewardedAmount'];
  public dataSource = new MatTableDataSource<any>([]);
  public form: FormGroup;
  public showingEnded = false;
  private destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dialog: MatDialog,
    private transloco: TranslocoService,
    public qearnService: QearnService,
    private walletService: WalletService,
    private _snackBar: MatSnackBar,
    private us: UpdaterService,
    private fb: FormBuilder,
    private qearnComponent: QearnComponent,
    private cdf: ChangeDetectorRef,
    private apiLiveService: ApiLiveService
  ) {
    this.form = this.fb.group({ sourceId: [''] });
  }

  ngOnInit() {
    this.setupSubscriptions();
    this.autoSelectFirstId();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSubscriptions(): void {
    this.qearnService.selectedPublicId
      .pipe(takeUntil(this.destroy$))
      .subscribe(publicId => {
        if (publicId) this.form.get('sourceId')?.setValue(publicId);
      });

    this.qearnService.txSuccessSubject
      .pipe(takeUntil(this.destroy$))
      .subscribe(this.handleTxSuccess.bind(this));

    this.form.get('sourceId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(this.loadData.bind(this));

    this.qearnService.stakeData$
      .pipe(takeUntil(this.destroy$))
      .subscribe(stakeDataMap => {
        const currentId = this.form.get('sourceId')?.value;
        if (currentId && stakeDataMap[currentId]) {
          this.loadData(currentId);
        }
      });

    this.qearnService.endedStakeData$
      .pipe(takeUntil(this.destroy$))
      .subscribe(endedStakeDataMap => {
        const currentId = this.form.get('sourceId')?.value;
        if (currentId && endedStakeDataMap[currentId]) {
          this.loadData(currentId);
        }
      });
  }

  private async handleTxSuccess(d: any) {
    if (!d?.publicId) return;

    this.qearnComponent.selectHistoryTabAndAddress(d.publicId);
    this.us.forceUpdateNetworkBalance(d.publicId, async () => {
      await this.qearnService.fetchStakeDataPerEpoch(d.publicId, d.epoch, this.qearnComponent.epoch, true);
      this.resetSourceId(d.publicId);
      this.cdf.detectChanges();
    });
  }

  private resetSourceId(publicId: string): void {
    this.form.get('sourceId')?.setValue(null);
    setTimeout(() => this.form.get('sourceId')?.setValue(publicId), 100);
  }

  private loadData(sourceId: string): void {
    if (!sourceId) return;

    this.dataSource.data = this.showingEnded
      ? [...(this.qearnService.endedStakeData[sourceId] || [])]
      : [...(this.qearnService.stakeData[sourceId] || [])].sort((a, b) => b.lockedEpoch - a.lockedEpoch);
  }

  public getSeeds = () => this.walletService.getSeeds();

  public getSelectedSeed() {
    const publicId = this.form.controls['sourceId'].value;
    return this.getSeeds().find(s => s.publicId === publicId);
  }

  public toggleView(): void {
    this.showingEnded = !this.showingEnded;
    this.loadData(this.form.get('sourceId')?.value);
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  openEarlyUnlockModal(element: IStakeStatus): void {
    if (!this.walletService.privateKey) {
      this.showSnackBar('qearn.history.pleaseUnlock', 'error');
      return;
    }

    const { publicId, lockedEpoch } = element;
    const seed = this.walletService.getSeed(publicId);
    if (!seed || (seed.balance < 1 && lockedEpoch !== this.qearnComponent.epoch)) {
      this.showSnackBar('qearn.history.unlock.insufficientMinTxAmount', 'error');
      return;
    }

    this.dialog.open(UnlockInputDialogComponent, {
      restoreFocus: false,
      data: { maxUnlockAmount: element.lockedAmount },
    }).afterClosed().pipe(takeUntil(this.destroy$)).subscribe(unlockAmount => {
      if (unlockAmount) this.openConfirmDialog(element, unlockAmount);
    });
  }

  private openConfirmDialog(element: IStakeStatus, unlockAmount: number): void {
    this.dialog.open(ConfirmDialog, {
      restoreFocus: false,
      data: {
        title: this.transloco.translate('qearn.history.unlock.title'),
        message: this.transloco.translate('qearn.history.unlock.message', {
          amount: this.formatAmount(unlockAmount),
        }),
        confirm: this.transloco.translate('confirmDialog.buttons.confirm'),
      },
    }).afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result) this.handleUnlockAction(element, unlockAmount);
    });
  }

  private async handleUnlockAction(element: IStakeStatus, unlockAmount: number) {
    try {
      const { publicId, lockedEpoch, lockedAmount } = element;
      const tick = (await lastValueFrom(this.apiLiveService.getTickInfo())).tickInfo.tick;
      const seed = await this.walletService.revealSeed(publicId);

      const unlockResult = await this.qearnService.unLockQubic(seed, unlockAmount, lockedEpoch, tick);
      if (!unlockResult) return;

      const newTick = tick + this.walletService.getSettings().tickAddition;
      this.qearnService.setPendingStake({
        publicId, amount: lockedAmount, epoch: lockedEpoch, targetTick: newTick, type: 'UNLOCK',
      });

      this.showSnackBar('qearn.history.unlock.success', 'success');
      this.qearnService.monitorUnlockTransaction(publicId, lockedAmount, this.qearnComponent.epoch, lockedEpoch);
    } catch (error) {
      this.showSnackBar('qearn.history.unlock.error', 'error');
    }
  }

  private formatAmount(amount: number): string {
    return amount.toString().replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  private showSnackBar(message: string, panelClass: string): void {
    this._snackBar.open(
      this.transloco.translate(message),
      this.transloco.translate('general.close'),
      { duration: 3000, panelClass }
    );
  }

  private autoSelectFirstId(): void {
    const seeds = this.walletService.getSeeds();
    if (seeds?.length > 0) {
      this.form.get('sourceId')?.setValue(seeds[0].publicId);
    }
  }
}
