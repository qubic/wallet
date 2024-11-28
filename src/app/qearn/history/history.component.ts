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
import { lastValueFrom } from 'rxjs';
import { ApiArchiverService } from 'src/app/services/api.archiver.service';
import { UpdaterService } from 'src/app/services/updater-service';
import { QearnComponent } from '../qearn.component';
import { UnlockInputDialogComponent } from '../components/unlock-input-dialog/unlock-input-dialog.component';

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

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dialog: MatDialog,
    private transloco: TranslocoService,
    public qearnService: QearnService,
    private walletService: WalletService,
    private _snackBar: MatSnackBar,
    private apiArchiver: ApiArchiverService,
    private us: UpdaterService,
    private fb: FormBuilder,
    private qearnComponent: QearnComponent,
    private cdf: ChangeDetectorRef
  ) {
    this.form = this.fb.group({ sourceId: [''] });
  }

  ngOnInit() {
    this.setupSubscriptions();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  private setupSubscriptions(): void {
    this.qearnService.selectedPublicId.subscribe(publicId => {
      if (publicId) this.form.get('sourceId')?.setValue(publicId);
    });

    this.qearnService.txSuccessSubject.subscribe(this.handleTxSuccess.bind(this));

    this.form.get('sourceId')?.valueChanges.subscribe(this.loadData.bind(this));
  }

  private async handleTxSuccess(d: any) {
    if (d?.publicId) {
      this.qearnComponent.selectHistoryTabAndAddress(d.publicId);
      await this.us.forceUpdateNetworkBalance(d.publicId, async () => {
        await this.qearnService.fetchStakeDataPerEpoch(d.publicId, d.epoch, this.qearnComponent.epoch, true);
        this.resetSourceId(d.publicId);
        this.cdf.detectChanges();
      });
    }
  }

  private resetSourceId(publicId: string): void {
    this.form.get('sourceId')?.setValue(null);
    setTimeout(() => this.form.get('sourceId')?.setValue(publicId), 100);
  }

  private loadData(sourceId: string): void {
    this.dataSource.data = this.showingEnded
      ? [...(this.qearnService.endedStakeData[sourceId] || [])]
      : [...(this.qearnService.stakeData[sourceId] || [])];
  }

  public getSeeds = () => this.walletService.getSeeds();

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

    const inputDialogRef = this.dialog.open(UnlockInputDialogComponent, {
      restoreFocus: false,
      data: { maxUnlockAmount: element.lockedAmount },
    });

    inputDialogRef.afterClosed().subscribe(unlockAmount => {
      if (unlockAmount) this.openConfirmDialog(element, unlockAmount);
    });
  }

  private openConfirmDialog(element: IStakeStatus, unlockAmount: number): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      restoreFocus: false,
      data: {
        title: this.transloco.translate('qearn.history.unlock.title'),
        message: this.transloco.translate('qearn.history.unlock.message', {
          amount: this.formatAmount(unlockAmount),
        }),
        confirm: this.transloco.translate('confirmDialog.buttons.confirm'),
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.handleUnlockAction(element, unlockAmount);
    });
  }

  private async handleUnlockAction(element: IStakeStatus, unlockAmount: number) {
    try {
      const { publicId, lockedEpoch, lockedAmount } = element;
      const tick = await lastValueFrom(this.apiArchiver.getCurrentTick());
      const seed = await this.walletService.revealSeed(publicId);
      
      const unlockResult = await this.qearnService.unLockQubic(seed, unlockAmount, lockedEpoch, tick);
      if (!unlockResult) return;

      const result = await this.qearnService.lockQubic(seed, lockedAmount, tick);
      if (!result.txResult) return;

      const newTick = tick + this.walletService.getSettings().tickAddition;
      this.qearnService.setPendingStake({
        publicId, amount: lockedAmount, epoch: lockedEpoch, targetTick: newTick, type: 'UNLOCK',
      });

      this.showSnackBar('qearn.history.unlock.success', 'success');
      this.qearnService.monitorUnlockTransaction(publicId, lockedAmount, this.qearnComponent.epoch, this);
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
}
