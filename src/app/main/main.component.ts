import { AfterViewInit, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
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
import { BalanceResponse, NetworkBalance, Transaction, MarketInformation } from '../services/api.model';
import { MatSort } from '@angular/material/sort';
import { UpdaterService } from '../services/updater-service';
import { QubicService } from '../services/qubic.service';
import { PublicKey } from 'qubic-ts-library/dist/qubic-types/PublicKey';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@ngneat/transloco';
import { QubicEntityResponse } from 'qubic-ts-library/dist/qubic-communication/QubicEntityResponse';
import { DecimalPipe } from '@angular/common';
import { AssetsDialog } from './assets/assets.component';
import { LoadConfigDialog } from '../lock/load-config/load-config.component';
import { ExportConfigDialog } from '../lock/export-config/export-config.component';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { DeviceDetectorService } from 'ngx-device-detector';


@Component({
  selector: 'qli-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements AfterViewInit {

  displayedColumns: string[] = ['alias', 'publicId', 'balance', 'currentEstimatedAmount', 'actions'];
  dataSource!: MatTableDataSource<ISeed>;
  balances: BalanceResponse[] = [];
  public transactions: Transaction[] = [];
  isTable: boolean = false;
  currentPrice: MarketInformation = ({ supply: 0, price: 0, capitalization: 0, currency: 'USD' });
  public isMobile = false;

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
  ) {
    this.isMobile = deviceService.isMobile();
    var dashBoardStyle = localStorage.getItem("dashboard-grid");
    this.isTable = dashBoardStyle == '0' ? true : false;

    this.updaterService.currentPrice.subscribe(response => {
      this.currentPrice = response;
    }, errorResponse => {
      this._snackBar.open(errorResponse.error, this.t.translate("general.close"), {
        duration: 0,
        panelClass: "error"
      });
    });

    this.setDataSource();
    updaterService.currentBalance.subscribe(b => {
      this.balances = b;
      this.setDataSource();
    })

    updaterService.internalTransactions.subscribe(txs => {
      this.transactions = txs;
    });

    if (this.dataSource.data.length == 0) {
      this.load();
    }
  }

  @HostListener('document:keydown.escape', ['$event']) 
  handleEscapeKey(event: KeyboardEvent): void {
    const disableAreasElements = document.querySelectorAll('.disable-area') as NodeListOf<HTMLElement>;
    disableAreasElements.forEach((area: HTMLElement) => {
      if (area.classList.contains('blurred')) {
        area.classList.remove('blurred');
      } else {
        area.classList.add('blurred');
      }
    });
  }

  ngAfterViewInit(): void {
    this.setDataSource();
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
  }


  load(): void {
    const dialogRef = this.dialog.open(LoadConfigDialog, { disableClose: true, });

    // Manually restore focus to the menu trigger since the element that
    // opens the dialog won't be in the DOM any more when the dialog closes.
    dialogRef.afterClosed().subscribe(() => {
      // do anything :)
    });
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
    return Number(this.walletService.getSeeds().reduce((p,c) => p + c.balance, 0) ?? BigInt(0));
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
    this.table.renderRows();
    this.updaterService.forceLoadAssets();
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  addSeed() {
    if (!this.walletService.privateKey) {
      const dialogRef = this.dialog.open(UnLockComponent, { restoreFocus: false });
      dialogRef.afterClosed().subscribe((r) => {
        if (this.walletService.privateKey) {
          const dialogRef = this.dialog.open(SeedEditDialog, {
            restoreFocus: false, data: {
              seed: null
            }
          });
          dialogRef.afterClosed().subscribe(result => {
            // do anything :)
            this.refreshData();
            if (result) {
              this.openExportDialog();
            }
          });
        }
      });
    } else {
      const dialogRef = this.dialog.open(SeedEditDialog, {
        restoreFocus: false, data: {
          seed: null
        }
      });
      dialogRef.afterClosed().subscribe(result => {
        this.setDataSource();
        this.refreshData();
        if (result) {
          this.openExportDialog();
        }
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
    const confirmDialo = this.dialog.open(SeedEditDialog, {
      restoreFocus: false, data: {
        publicId: publicId
      }
    });
    confirmDialo.afterClosed().subscribe(result => {
      if (result) {
        this.openExportDialog();
      }
    })
  }

  openExportDialog(disableClose = true) {
    const dialogRef = this.dialog.open(ExportConfigDialog, { disableClose: disableClose, });
    dialogRef.afterClosed().subscribe(() => {
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

  reveal(publicId: string) {
    const confirmDialo = this.dialog.open(RevealSeedDialog, {
      restoreFocus: false, data: {
        publicId: publicId
      }
    });
  }
  assets(publicId: string) {
    const confirmDialo = this.dialog.open(AssetsDialog, {
      restoreFocus: false, data: {
        publicId: publicId
      }
    });
  }


  delete(publicId: string) {
    const confirmDialo = this.dialog.open(ConfirmDialog, { restoreFocus: false });
    confirmDialo.afterClosed().subscribe(result => {
      if (result) {
        this.walletService.deleteSeed(publicId);
        this.refreshData();
        this.openExportDialog();
      }
    })
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
}
