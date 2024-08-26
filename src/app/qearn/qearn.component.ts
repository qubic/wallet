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
  public epoch: number = 130;
  @ViewChild('tabGroup') tabGroup!: MatTabGroup;
  constructor(private qearnService: QearnService, private walletService: WalletService, private apiArchiver: ApiArchiverService, private us: UpdaterService) {}

  async ngOnInit() {
    // Update the current balance
    this.us.loadCurrentBalance();

    // Fetching Lock Info and Stake Data
    this.apiArchiver.getStatus().subscribe(async (res) => {
      this.epoch = res.lastProcessedTick.epoch;
      const seeds = this.walletService.getSeeds();
      this.qearnService.setLoading(true);
      for (let i = 0; i < seeds.length; i++) {
        const pubKey = new PublicKey(seeds[i].publicId).getPackageData();
        const epochs = await this.qearnService.getUserLockStatus(pubKey, this.epoch);
        for (let j = 0; j < epochs.length; j++) {
          this.qearnService.fetchLockInfo(epochs[j]);
          this.qearnService.fetchStakeDataPerEpoch(seeds[i].publicId, epochs[j], this.epoch);
        }
        await this.qearnService.fetchEndedStakeData(seeds[i].publicId);
      }
      this.qearnService.setLoading(false);
    });
  }

  selectHistoryTabAndAddress(publicId: string): void {
    this.tabGroup.selectedIndex = 1;
    this.qearnService.selectedPublicId.next(publicId);
  }
}
