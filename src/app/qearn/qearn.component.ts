import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiArchiverService } from '../services/api.archiver.service';
import { WalletService } from '../services/wallet.service';
import { QearnService } from '../services/qearn.service';
import { PublicKey } from 'qubic-ts-library/dist/qubic-types/PublicKey';
import { MatTabGroup } from '@angular/material/tabs';
import { UpdaterService } from '../services/updater-service';

@Component({
  selector: 'app-qearn',
  templateUrl: './qearn.component.html',
  styleUrls: ['./qearn.component.scss'],
})
export class QearnComponent implements OnInit {
  public epoch: number = 0;
  public currentLockedAmount = 0;
  public yieldPercentage = 0.00;

  @ViewChild('tabGroup') tabGroup!: MatTabGroup;
  constructor(public qearnService: QearnService, private walletService: WalletService, private apiArchiver: ApiArchiverService, private us: UpdaterService) {}

  async ngOnInit() {
    // Update the current balance
    this.us.loadCurrentBalance();

    // Fetching Lock Info and Stake Data
    this.apiArchiver.getStatus().subscribe(async (res) => {
      this.epoch = res.lastProcessedTick.epoch;
      const epochInfo = this.qearnService?.epochInfo?.[this.epoch];
      this.currentLockedAmount = epochInfo?.currentLockedAmount || 0;
      this.yieldPercentage = (epochInfo?.yieldPercentage || 0) / 100000;

      // Fetching current epoch info
      await this.qearnService.fetchLockInfo(this.epoch)
      const seeds = this.walletService.getSeeds();
      this.qearnService.setLoading(true);
      for (const seed of seeds) {
        const pubKey = new PublicKey(seed.publicId).getPackageData();
        const epochs = await this.qearnService.getUserLockStatus(pubKey, this.epoch);
        for (const epoch of epochs) {
          await this.qearnService.fetchLockInfo(epoch);
          await this.qearnService.fetchStakeDataPerEpoch(seed.publicId, epoch, this.epoch);
        }
        await this.qearnService.fetchEndedStakeData(seed.publicId);
      }
      this.qearnService.setLoading(false);
    });
  }

  selectHistoryTabAndAddress(publicId: string): void {
    this.tabGroup.selectedIndex = 1;
    this.qearnService.selectedPublicId.next(publicId);
  }
}
