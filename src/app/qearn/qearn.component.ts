import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { ApiQueryService } from '../services/apis/query/api.query.service';
import { WalletService } from '../services/wallet.service';
import { QearnService } from '../services/qearn.service';
import { PublicKey } from '@qubic-lib/qubic-ts-library/dist/qubic-types/PublicKey';
import { MatTabGroup } from '@angular/material/tabs';
import { UpdaterService } from '../services/updater-service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-qearn',
  templateUrl: './qearn.component.html',
  styleUrls: ['./qearn.component.scss'],
})
export class QearnComponent implements OnInit, OnDestroy {
  public epoch: number = 0;
  public currentLockedAmount = 0;
  public yieldPercentage = 0.0;
  private unsubscribe$ = new Subject<void>();

  @ViewChild('tabGroup') tabGroup!: MatTabGroup;
  constructor(public qearnService: QearnService, private walletService: WalletService, private apiQuery: ApiQueryService, private us: UpdaterService) {}

  async ngOnInit() {
    // Update the current balance
    this.us.loadCurrentBalance();

    // Fetching Lock Info and Stake Data
    this.apiQuery
      .getLastProcessedTick()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(async (res) => {
        try {
          this.epoch = res.epoch;
          this.qearnService.epochInfo$.pipe(takeUntil(this.unsubscribe$)).subscribe((epochInfos) => {
            const epochInfo = epochInfos[this.epoch];
            this.currentLockedAmount = epochInfo?.currentLockedAmount || 0;
            this.yieldPercentage = (epochInfo?.yieldPercentage || 0) / 100000;
          });

          // Fetching current epoch info
          await this.qearnService.fetchLockInfo(this.epoch);
          const seeds = this.walletService.getSeeds();
          if (!seeds || seeds.length === 0) {
            console.warn('No seeds available');
            return;
          }
          this.qearnService.setLoading(true);

          try {
            const lockStatusPromises = seeds.map(async (seed) => {
              const pubKey = new PublicKey(seed.publicId).getPackageData();
              const epochs = await this.qearnService.getUserLockStatus(pubKey, this.epoch);
              return { seed, epochs };
            });

            const seedEpochs = await Promise.all(lockStatusPromises);

            const uniqueEpochs = new Set<number>();
            seedEpochs.forEach(({ epochs }) => {
              epochs.forEach((epoch) => uniqueEpochs.add(epoch));
            });

            await Promise.all(Array.from(uniqueEpochs).map((epoch) => this.qearnService.fetchLockInfo(epoch)));

            await Promise.all(
              seedEpochs.map(async ({ seed, epochs }) => {
                await Promise.all([...epochs.map((epoch) => this.qearnService.fetchStakeDataPerEpoch(seed.publicId, epoch, this.epoch)), this.qearnService.fetchEndedStakeData(seed.publicId)]);
              })
            );
          } finally {
            this.qearnService.setLoading(false);
          }
        } catch (error) {
          console.error(error);
        }
      });
  }

  ngOnDestroy(): void {
    this.qearnService.setLoading(false);
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
  selectHistoryTabAndAddress(publicId: string): void {
    this.tabGroup.selectedIndex = 1;
    this.qearnService.selectedPublicId.next(publicId);
  }
}
