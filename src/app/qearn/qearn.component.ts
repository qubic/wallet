import { Component, OnInit } from '@angular/core';
import { ApiArchiverService } from '../services/api.archiver.service';
import { WalletService } from '../services/wallet.service';
import { QearnService } from '../services/qearn.service';
import { PublicKey } from 'qubic-ts-library/dist/qubic-types/PublicKey';

@Component({
  selector: 'app-qearn',
  templateUrl: './qearn.component.html',
  styleUrls: ['./qearn.component.scss'],
})
export class QearnComponent implements OnInit {
  public epoch: number = 130;
  constructor(private qearnService: QearnService, private walletService: WalletService, private apiArchiver: ApiArchiverService) {}

  async ngOnInit() {
    this.apiArchiver.getStatus().subscribe((res) => {
      this.epoch = res.lastProcessedTick.epoch;
    });
    
    const seeds = this.walletService.getSeeds();
    
    for (let i = 0; i < seeds.length; i++) {
      const epochs = await this.qearnService.getUserLockStatus(new PublicKey(seeds[i].publicId).getPackageData(), this.epoch);
      
      console.log(epochs)
      
      for (let j = 0; j < epochs.length; j++) {
        this.qearnService.fetchLockInfo(epochs[j]);
        this.qearnService.fetchStakeDataPerEpoch(seeds[i].publicId, epochs[j], this.epoch);
      }
    }
  }
}
