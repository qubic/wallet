import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { ConfirmDialog } from '../core/confirm-dialog/confirm-dialog.component';
import { UnLockComponent } from '../lock/unlock/unlock.component';
import { ISeed } from '../model/seed';
import { WalletService } from '../services/wallet.service';
import { SeedEditDialog } from './edit-seed/seed-edit.component';
import { RevealSeedDialog } from './reveal-seed/reveal-seed.component';
import { Router } from '@angular/router';
import { QrReceiveDialog } from './qr-receive/qr-receive.component';
import { BalanceResponse, NetworkBalance, Transaction } from '../services/api.model';
import { MatSort } from '@angular/material/sort';
import { UpdaterService } from '../services/updater-service';
import { QubicService } from '../services/qubic.service';
import { PublicKey } from '@qubic-lib/qubic-ts-library/dist/qubic-types/PublicKey';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@ngneat/transloco';
import { QubicEntityResponse } from '@qubic-lib/qubic-ts-library/dist/qubic-communication/QubicEntityResponse';
import { DecimalPipe } from '@angular/common';
import { AssetsDialog } from './assets/assets.component';
import { ExportConfigDialog } from '../lock/export-config/export-config.component';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { DeviceDetectorService } from 'ngx-device-detector';
import { OkDialog } from 'src/app/core/ok-dialog/ok-dialog.component';
import { LatestStatsResponse } from '../services/apis/stats/api.stats.model';
import { ExplorerUrlHelper } from '../services/explorer-url.helper';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';


@Component({
  selector: 'qli-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements AfterViewInit, OnDestroy {

  private destroy$ = new Subject<void>();

  displayedColumns: string[] = ['alias', 'balance', 'currentEstimatedAmount', 'actions'];
  dataSource!: MatTableDataSource<ISeed>;
  balances: BalanceResponse[] = [];
  public transactions: Transaction[] = [];
  isTable: boolean = false;
  isVaultExportDialog: boolean = false;
  isLoadingBalances: boolean = true;

  latestStats: LatestStatsResponse = {
    data: {
      price: 0,
      timestamp: '',
      circulatingSupply: '',
      activeAddresses: 0,
      marketCap: '',
      epoch: 0,
      currentTick: 0,
      ticksInCurrentEpoch: 0,
      emptyTicksInCurrentEpoch: 0,
      epochTickQuality: 0,
      burnedQus: ''
    }
  }

  public isMobile = false;
  textQubicLiShutdown: string = "Effective June 30, 2024, the website wallet.qubic.li will no longer be updated. Please use <a href='https://wallet.qubic.org' title='open'>wallet.qubic.org</a> instead."
  maxNumberOfAddresses: number = 15;


  @ViewChild(MatTable)
  table!: MatTable<ISeed>;

  @ViewChild(MatSort)
  sort!: MatSort;



  constructor(
    public walletService: WalletService,
    public dialog: MatDialog,
    private router: Router,
    private updaterService: UpdaterService,
    private q: QubicService,
    private _snackBar: MatSnackBar,
    private t: TranslocoService,
    private decimalPipe: DecimalPipe,
    private deviceService: DeviceDetectorService,
    private transloco: TranslocoService,
  ) {

    this.walletService.updateConfig({ useBridge: false, });
    this.isMobile = deviceService.isMobile();
    var dashBoardStyle = localStorage.getItem("dashboard-grid");
    this.isTable = dashBoardStyle == '0' ? true : false;
    const domain = window.location.hostname;

    var vaultExportDialog = localStorage.getItem("vault-export-dialog");
    this.isVaultExportDialog = vaultExportDialog == '1' ? true : false;

    this.updaterService.latestStats
      .pipe(takeUntil(this.destroy$))
      .subscribe(response => {
        this.latestStats = response;
      }, errorResponse => {
        this._snackBar.open(errorResponse.error, this.t.translate("general.close"), {
          duration: 0,
          panelClass: "error"
        });
      });

    updaterService.isLoadingBalance
      .pipe(takeUntil(this.destroy$))
      .subscribe(isLoading => {
        this.isLoadingBalances = isLoading;
      });

    updaterService.currentBalance
      .pipe(takeUntil(this.destroy$))
      .subscribe(b => {
        this.balances = b;
        this.setDataSource();
      });

    updaterService.internalTransactions
      .pipe(takeUntil(this.destroy$))
      .subscribe(txs => {
        this.transactions = txs;
      });

    //1. vault file export due to move to new wallet
    // if (domain === 'wallet.qubic.li' || domain === 'localhost') {
    if (domain === 'wallet.qubic.li') {
      if (walletService.privateKey == null) {
        if (!this.isVaultExportDialog) {
          const dialogRef = this.dialog.open(OkDialog, {
            data: {
              title: this.transloco.translate("switchExportDialog.title"),
              message: this.transloco.translate("switchExportDialog.okDialogMessage"),
              button: this.transloco.translate("okDialog.button")
            },
          });

          dialogRef.afterClosed()
            .pipe(takeUntil(this.destroy$))
            .subscribe(result => {
              const dialogRefUnLock = this.dialog.open(UnLockComponent, { restoreFocus: false });

              dialogRefUnLock.afterClosed()
                .pipe(takeUntil(this.destroy$))
                .subscribe(result => {
                  if (walletService.privateKey) {
                    this.openVaultExportDialog();
                  }
                })
            })
        }
      } else {
        this.openVaultExportDialog();
      }
    } else {
      this.textQubicLiShutdown = "";
    }
  }


  ngAfterViewInit(): void {
    // Ensure we have data before setting datasource
    // setDataSource will be called when currentBalance subscription fires
    if (this.balances && this.balances.length > 0) {
      this.setDataSource();
    } else {
      // Initialize with empty data to show the table structure
      this.dataSource = new MatTableDataSource(this.walletService.getSeeds());
      this.dataSource.sort = this.sort;
    }
  }


  //2. vault file export due to move to new wallet
  openVaultExportDialog(): void {
    if (!this.isVaultExportDialog) {
      const confirmDialo = this.dialog.open(ConfirmDialog, {
        restoreFocus: false, data: {
          title: this.transloco.translate("switchExportDialog.title"),
          message: this.transloco.translate("switchExportDialog.confirmationText"),
          cancel: this.transloco.translate("switchExportDialog.buttons.cancel"),
          confirm: this.transloco.translate("switchExportDialog.buttons.confirm")
        }
      });
      confirmDialo.afterClosed()
        .pipe(takeUntil(this.destroy$))
        .subscribe(result => {
          if (result) {
            //  alert("export vault");
            this.openExportDialog();

          this.isVaultExportDialog = true;
          localStorage.setItem("vault-export-dialog", this.isVaultExportDialog ? '1' : '0');
        }
      })
    }
  }

  setDataSource(): void {
    this.dataSource = new MatTableDataSource(this.walletService.getSeeds().map(m => {

      if (!this.walletService.getSettings().useBridge) {
        if (!m.balanceTick || m.balanceTick === 0) {
          m.balance = this.getDeprecatedBalance(m.publicId);
          (<any>m).currentEstimatedAmount = this.getEpochChanges(m.publicId);
          m.lastUpdate = this.getDeprecatedLastUpdate(m.publicId);
        }
      }
      return m;
    }));
    this.dataSource.sort = this.sort;
  }


  toggleTableView(event: MatSlideToggleChange) {
    this.isTable = !this.isTable;
    localStorage.setItem("dashboard-grid", this.isTable ? '0' : '1');
    this.isTable = event.checked;
    window.location.reload();
  }

  getDeprecatedBalance(publicId: string): number {
    var balanceEntry = this.balances.find(f => f.publicId === publicId);
    return balanceEntry?.currentEstimatedAmount ?? balanceEntry?.epochBaseAmount ?? 0;
  }

  getDeprecatedLastUpdate(publicId: string): Date | undefined {
    var balanceEntry = this.balances.find(f => f.publicId === publicId);
    return balanceEntry ? new Date() : undefined;
  }

  getTotalBalance(): number {
    return Number(this.walletService.getSeeds().filter((s) => !s.isOnlyWatch).reduce((p, c) => p + c.balance, 0) ?? BigInt(0));
  }

  getBalance(publicId: string): number {
    return Number(this.walletService.getSeed(publicId)?.balance ?? BigInt(0));
  }

  getEpochChanges(publicId: string): number {
    var balanceEntry = this.balances.find(f => f.publicId === publicId);
    return this.getBalance(publicId) - (balanceEntry?.epochBaseAmount ?? 0); // balanceEntry?.epochChanges ?? 0;
  }

  refreshData() {
    this.setDataSource();
    if (this.isTable) {
      this.table.renderRows();
    }
    this.updaterService.forceLoadAssets();
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  addSeed() {
    if (this.walletService.getSeeds().length >= this.maxNumberOfAddresses) {
      const dialogRef = this.dialog.open(OkDialog, {
        data: {
          title: this.transloco.translate("maxNumberOfAddressesDialog.title"),
          message: this.transloco.translate("maxNumberOfAddressesDialog.message"),
          button: this.transloco.translate("maxNumberOfAddressesDialog.button")
        },
      });
      return;
    }

    if (!this.walletService.privateKey) {
      const dialogRef = this.dialog.open(UnLockComponent, { restoreFocus: false });
      dialogRef.afterClosed()
        .pipe(takeUntil(this.destroy$))
        .subscribe(result => {
          if (this.walletService.privateKey) {
            this.addSeed(); // execute the action again
          }
        });
    } else {
      const dialogRef = this.dialog.open(SeedEditDialog, {
        restoreFocus: false, data: {
          seed: null
        }
      });
      dialogRef.afterClosed()
        .pipe(takeUntil(this.destroy$))
        .subscribe(result => {
          this.setDataSource();
          this.refreshData();
        })
    }
  }

  payment(publicId: string) {
    this.router.navigate(['/', 'payment'], {
      queryParams: {
        publicId: publicId
      }
    });
  }

  edit(publicId: string) {
    if (!this.walletService.privateKey) {
      const dialogRef = this.dialog.open(UnLockComponent, { restoreFocus: false });
      dialogRef.afterClosed()
        .pipe(takeUntil(this.destroy$))
        .subscribe(result => {
          if (this.walletService.privateKey) {
            this.edit(publicId); // execute the action again
          }
        });
    } else {
      const confirmDialog = this.dialog.open(SeedEditDialog, {
        restoreFocus: false, data: {
          publicId: publicId
        }
      });
      confirmDialog.afterClosed()
        .pipe(takeUntil(this.destroy$))
        .subscribe(result => {
          if (result) {
            this.openExportDialog();
          }
        });
    }
  }

  openExportDialog(disableClose = true) {
    const dialogRef = this.dialog.open(ExportConfigDialog, { disableClose: disableClose, });
    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // do anything :)
      });
  }

  receive(publicId: string) {
    const qrDialog = this.dialog.open(QrReceiveDialog, {
      restoreFocus: false, data: {
        publicId: publicId
      }
    });
  }

  hasAssets(publicId: string): boolean {
    return (this.walletService.getSeed(publicId)?.assets?.length ?? 0) > 0;
  }

  hasIsOnlyWatch(publicId: string): boolean {
    return !this.walletService.getSeed(publicId)?.isOnlyWatch ?? false;
  }

  reveal(publicId: string) {
    if (!this.walletService.privateKey) {
      const dialogRef = this.dialog.open(UnLockComponent, { restoreFocus: false });
      dialogRef.afterClosed()
        .pipe(takeUntil(this.destroy$))
        .subscribe(result => {
          if (this.walletService.privateKey) {
            this.reveal(publicId); // execute the action again
          }
        });
    } else {
      const confirmDialo = this.dialog.open(RevealSeedDialog, {
        restoreFocus: false, data: {
          publicId: publicId,
          isOnlyWatch: this.walletService.getSeed(publicId)?.isOnlyWatch ?? false
        }
      });
    }
  }


  openAssetsPage() {
    this.router.navigate(['/assets-area']);
  }

  openExplorer(publicId: string) {
    window.open(ExplorerUrlHelper.getAddressUrl(publicId), '_blank');
  }


  assets(publicId: string) {
    const confirmDialo = this.dialog.open(AssetsDialog, {
      restoreFocus: false, data: {
        publicId: publicId
      }
    });
  }


  delete(publicId: string) {
    if (!this.walletService.privateKey) {
      const dialogRef = this.dialog.open(UnLockComponent, { restoreFocus: false });
      dialogRef.afterClosed()
        .pipe(takeUntil(this.destroy$))
        .subscribe(result => {
          if (this.walletService.privateKey) {
            this.delete(publicId); // execute the action again
          }
        });
    } else {
      const confirmDialo = this.dialog.open(ConfirmDialog, { restoreFocus: false });
      confirmDialo.afterClosed()
        .pipe(takeUntil(this.destroy$))
        .subscribe(result => {
          if (result) {
            this.walletService.deleteSeed(publicId);
            this.refreshData();
            this.openExportDialog();
          }
        });
    }
  }

  refreshBalance(publicId: string) {
    if (this.walletService.getSettings().useBridge) {
      if (!this.q.isConnected.getValue()) {
        this._snackBar.open(this.t.translate('general.messages.notConnected'), this.t.translate('general.close'), {
          duration: 10000,
          panelClass: "error"
        });
      } else {
        if (this.q.updateBalance(new PublicKey(publicId), (entityResponse: QubicEntityResponse): boolean => {
          if (entityResponse.getEntity().getPublicKey().equals(new PublicKey(publicId))) {
            this._snackBar.open(this.t.translate('general.messages.balanceReceived', { publicId: publicId, balance: this.decimalPipe.transform(entityResponse.getEntity().getBalance(), '1.0-0') }), this.t.translate('general.close'), {
              duration: 10000,
            });
            return true;
          }
          return false;
        })) {
          this._snackBar.open(this.t.translate('general.messages.refreshRequested'), this.t.translate('general.close'), {
            duration: 5000,
          });
        } else {
          this._snackBar.open(this.t.translate('general.messages.refreshFailed'), this.t.translate('general.close'), {
            duration: 10000,
            panelClass: "error"
          });
        }
      }
    } else {
      this.updaterService.forceUpdateNetworkBalance(publicId, (balances: NetworkBalance[]) => {
        if (balances) {
          var entry = balances.find(f => f.publicId == publicId);
          if (entry) {
            this._snackBar.open(this.t.translate('general.messages.balanceReceived', { publicId: publicId, balance: this.decimalPipe.transform(entry.amount, '1.0-0') }), this.t.translate('general.close'), {
              duration: 5000,
            });
          }
        }
      });
    }
  }


  hasPendingTransaction(publicId: string) {
    return this.transactions.find(t => (t.sourceId == publicId || t.destId == publicId) && t.isPending);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

