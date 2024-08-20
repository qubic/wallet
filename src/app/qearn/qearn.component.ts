import { Component, OnInit } from '@angular/core';
import { ApiArchiverService } from '../services/api.archiver.service';
import { WalletService } from '../services/wallet.service';
import { QearnService } from '../services/qearn.service';

@Component({
  selector: 'app-qearn',
  templateUrl: './qearn.component.html',
  styleUrls: ['./qearn.component.scss'],
})
export class QearnComponent implements OnInit {
  public epoch: number = 130;
  constructor(private qearnService: QearnService, private walletService: WalletService, private apiArchiver: ApiArchiverService) {}

  ngOnInit(): void {
    this.apiArchiver.getStatus().subscribe((res) => {
      this.epoch = res.lastProcessedTick.epoch;
    });
    this.qearnService.fetchAllLockInfoFromCurrentEpoch(this.epoch);
    const seeds = this.walletService.getSeeds();
    for (let i = 0; i < seeds.length; i++) {
      this.qearnService.fetchStakeDataOfPublicId(seeds[i].publicId, this.epoch);
    }
  }
}
