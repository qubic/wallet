import { Injectable } from '@angular/core';
import { ApiService } from '../services/api.service';
import { filter, lastValueFrom, Subject, take, BehaviorSubject } from 'rxjs';
import { WalletService } from './wallet.service';
import { PublicKey } from '@qubic-lib/qubic-ts-library/dist/qubic-types/PublicKey';
import { REWARD_DATA } from '../qearn/reward-table/table-data';
import { UpdaterService } from './updater-service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@ngneat/transloco';
import { ApiLiveService } from './apis/live/api.live.service';

interface LockInfoPerEpoch {
  lockAmount: number;
  bonusAmount: number;
  currentLockedAmount: number;
  currentBonusAmount: number;
  yieldPercentage: number;
}

export interface IStakeStatus {
  publicId: string;
  lockedEpoch: number;
  lockedAmount: number;
  lockedWeeks: number;
  totalLockedAmountInEpoch: number;
  currentBonusAmountInEpoch: number;
  earlyUnlockReward: number;
  fullUnlockReward: number;
  earlyUnlockRewardRatio: number;
  fullUnlockRewardRatio: number;
}

export interface IEndedStakeStatus {
  unLockedAmount: number;
  rewardedAmount: number;
  status?: boolean;
}

interface PendingStake {
  publicId: string;
  amount: number;
  epoch: number;
  targetTick: number;
  type: string;
}

@Injectable({
  providedIn: 'root',
})
export class QearnService {
  private epochInfoSubject = new BehaviorSubject<{ [key: number]: LockInfoPerEpoch }>({});
  public epochInfo$ = this.epochInfoSubject.asObservable();
  public epochInfo: { [key: number]: LockInfoPerEpoch } = {};
  public stakeData: { [key: string]: IStakeStatus[] } = {};
  public stakeDataSubject = new BehaviorSubject<{ [key: string]: IStakeStatus[] }>({});
  public stakeData$ = this.stakeDataSubject.asObservable();
  public endedStakeDataSubject = new BehaviorSubject<{ [key: string]: IEndedStakeStatus[] }>({});
  public endedStakeData$ = this.endedStakeDataSubject.asObservable();
  public endedStakeData: { [key: string]: IEndedStakeStatus[] } = {};
  public isLoading = false;
  public pendingStake: PendingStake | null = null;
  public txSuccessSubject = new Subject<PendingStake>();
  public selectedPublicId = new Subject<string>();

  constructor(private apiLiveService: ApiLiveService, private walletService: WalletService, private us: UpdaterService, private _snackBar: MatSnackBar, private transloco: TranslocoService) {}

  private async queryStakingData(inputType: number, inputSize: number, requestData: string) {
    return lastValueFrom(
      this.apiLiveService.submitQuerySmartContract({
        contractIndex: 9,
        inputType,
        inputSize,
        requestData,
      })
    );
  }

  private createDataView(size: number): { buffer: ArrayBuffer; view: DataView } {
    const buffer = new ArrayBuffer(size);
    return { buffer, view: new DataView(buffer) };
  }

  public async lockQubic(seed: string, amount: number, tick: number) {
    return this.apiLiveService.submitQearnTransaction(seed, 9, 1, 0, amount, {}, tick);
  }

  public async unLockQubic(seed: string, amount: number, epoch: number, tick: number) {
    return this.apiLiveService.submitQearnTransaction(seed, 9, 2, 12, 0, { UnlockAmount: amount, LockedEpoch: epoch }, tick);
  }

  public async getLockInfoPerEpoch(epoch: number): Promise<LockInfoPerEpoch> {
    const { buffer, view } = this.createDataView(4);
    view.setUint32(0, epoch, true);
    const base64String = this.walletService.arrayBufferToBase64(buffer);

    const res = await this.queryStakingData(1, 4, base64String);
    if (!res.responseData) {
      return { lockAmount: 0, bonusAmount: 0, currentLockedAmount: 0, currentBonusAmount: 0, yieldPercentage: 0 };
    }

    const responseBuffer = this.walletService.base64ToArrayBuffer(res.responseData);
    const dataView = new DataView(responseBuffer);
    return {
      lockAmount: Number(dataView.getBigUint64(0, true)),
      bonusAmount: Number(dataView.getBigUint64(8, true)),
      currentLockedAmount: Number(dataView.getBigUint64(16, true)),
      currentBonusAmount: Number(dataView.getBigUint64(24, true)),
      yieldPercentage: Number(dataView.getBigUint64(32, true)),
    };
  }

  public async getUserLockInfo(user: Uint8Array, epoch: number): Promise<number> {
    const { buffer, view } = this.createDataView(36);
    user.forEach((byte, index) => view.setUint8(index, byte));
    view.setUint32(32, epoch, true);

    const base64String = this.walletService.arrayBufferToBase64(buffer);
    const res = await this.queryStakingData(2, 36, base64String);

    if (!res.responseData) return 0;

    const responseBuffer = this.walletService.base64ToArrayBuffer(res.responseData);
    return Number(new DataView(responseBuffer).getBigUint64(0, true));
  }

  public async getStateOfRound(epoch: number): Promise<{ state: number }> {
    const { buffer, view } = this.createDataView(4);
    view.setUint32(0, epoch, true);

    const base64String = this.walletService.arrayBufferToBase64(buffer);
    const res = await this.queryStakingData(3, 4, base64String);

    if (!res.responseData) return { state: 0 };

    const responseBuffer = this.walletService.base64ToArrayBuffer(res.responseData);
    return { state: new DataView(responseBuffer).getUint32(0, true) };
  }

  public async getUserLockStatus(user: Uint8Array, currentEpoch: number): Promise<number[]> {
    const { buffer, view } = this.createDataView(32);
    user.forEach((byte, index) => view.setUint8(index, byte));

    const base64String = this.walletService.arrayBufferToBase64(buffer);
    const res = await this.queryStakingData(4, 32, base64String);

    if (!res.responseData) return [];

    const responseBuffer = this.walletService.base64ToArrayBuffer(res.responseData);
    const state = Number(new DataView(responseBuffer).getBigUint64(0, true));

    return state
      .toString(2)
      .split('')
      .reverse()
      .reduce((epochs, bit, index) => (bit === '1' ? [...epochs, currentEpoch - index] : epochs), [] as number[]);
  }

  public async getEndedStatus(user: Uint8Array): Promise<{ fullUnlockedAmount?: number; fullRewardedAmount?: number; earlyUnlockedAmount?: number; earlyRewardedAmount?: number }> {
    const { buffer, view } = this.createDataView(32);
    user.forEach((byte, index) => view.setUint8(index, byte));

    const base64String = this.walletService.arrayBufferToBase64(buffer);
    const res = await this.queryStakingData(5, 32, base64String);

    if (!res.responseData) return {};
    const responseBuffer = this.walletService.base64ToArrayBuffer(res.responseData);
    const responseView = new DataView(responseBuffer);

    return {
      fullUnlockedAmount: Number(responseView.getBigUint64(0, true)),
      fullRewardedAmount: Number(responseView.getBigUint64(8, true)),
      earlyUnlockedAmount: Number(responseView.getBigUint64(16, true)),
      earlyRewardedAmount: Number(responseView.getBigUint64(24, true)),
    };
  }

  public async fetchLockInfo(epoch: number) {
    const res = await this.getLockInfoPerEpoch(epoch);
    this.epochInfo = { ...this.epochInfo, [epoch]: res };
    this.epochInfoSubject.next(this.epochInfo);
    return res;
  }

  private calculateRewards(lockAmount: number, totalLockedAmount: number, currentBonusAmount: number, yieldPercentage: number, currentEpoch: number, lockedEpoch: number) {
    const fullUnlockPercent = yieldPercentage / 100000;
    const fullUnlockReward = currentBonusAmount * (lockAmount / totalLockedAmount);

    const earlyUnlockPercent = REWARD_DATA.find((data) => data.weekFrom < currentEpoch - lockedEpoch && data.weekTo + 1 >= currentEpoch - lockedEpoch)?.earlyUnlock || 0;
    const earlyUnlockReward = fullUnlockReward * (earlyUnlockPercent / 100);

    return {
      earlyUnlockReward,
      earlyUnlockRewardRatio: (fullUnlockPercent * earlyUnlockPercent) / 100,
      fullUnlockReward,
      fullUnlockRewardRatio: fullUnlockPercent,
    };
  }

  public async fetchStakeDataPerEpoch(publicId: string, epoch: number, currentEpoch: number, update: boolean = false) {
    if (!this.epochInfo[epoch] || update) {
      await this.fetchLockInfo(epoch);
    }

    const pubKey = new PublicKey(publicId).getPackageData();
    const lockAmount = await this.getUserLockInfo(pubKey, epoch);

    if (!lockAmount) {
      this.stakeData[publicId] = (this.stakeData[publicId] || []).filter((data) => data.lockedEpoch !== epoch);
      this.stakeDataSubject.next(this.stakeData);
      return;
    }

    if (!this.stakeData[publicId]) {
      this.stakeData[publicId] = [];
    }

    const { currentLockedAmount, currentBonusAmount, yieldPercentage } = this.epochInfo[epoch];
    const rewards = this.calculateRewards(lockAmount, currentLockedAmount, currentBonusAmount, yieldPercentage, currentEpoch, epoch);

    const stakeData = {
      publicId,
      lockedEpoch: epoch,
      lockedAmount: lockAmount,
      lockedWeeks: Math.max(0, currentEpoch - epoch - 1),
      totalLockedAmountInEpoch: currentLockedAmount,
      currentBonusAmountInEpoch: currentBonusAmount,
      ...rewards,
    };

    const existingDataIndex = this.stakeData[publicId].findIndex((data) => data.lockedEpoch === epoch);
    if (existingDataIndex !== -1) {
      this.stakeData[publicId][existingDataIndex] = stakeData;
    } else {
      this.stakeData[publicId].push(stakeData);
    }

    this.stakeDataSubject.next(this.stakeData);

    return stakeData;
  }

  public async fetchEndedStakeData(publicId: string) {
    const endedStatus = await this.getEndedStatus(new PublicKey(publicId).getPackageData());
    if (!endedStatus) return;

    if (!this.endedStakeData[publicId]) {
      this.endedStakeData[publicId] = [];
      this.endedStakeDataSubject.next(this.endedStakeData);
    }

    const updateOrAddStatus = (status: boolean, unLockedAmount: number, rewardedAmount: number) => {
      const index = this.endedStakeData[publicId].findIndex((data) => data.status === status);
      const newData = { unLockedAmount, rewardedAmount, status };

      if (index !== -1) {
        this.endedStakeData[publicId][index] = newData;
        this.endedStakeDataSubject.next(this.endedStakeData);
      } else {
        this.endedStakeData[publicId].push(newData);
        this.endedStakeDataSubject.next(this.endedStakeData);
      }
    };

    updateOrAddStatus(true, endedStatus.fullUnlockedAmount ?? 0, endedStatus.fullRewardedAmount ?? 0);
    updateOrAddStatus(false, endedStatus.earlyUnlockedAmount ?? 0, endedStatus.earlyRewardedAmount ?? 0);
  }

  public setPendingStake(pendingStake: PendingStake | null) {
    this.pendingStake = pendingStake;
  }

  public setLoading(isLoading: boolean) {
    this.isLoading = isLoading;
  }

  private async monitorTransaction(publicId: string, initialLockedAmount: number, epoch: number, currentEpoch: number, type: 'stake' | 'unlock'): Promise<void> {
    this.us.currentTick
      .pipe(
        filter((tick) => this.pendingStake !== null && tick > this.pendingStake.targetTick),
        take(1)
      )
      .subscribe(async () => {
        await this.fetchStakeDataPerEpoch(publicId, epoch, currentEpoch, true);

        const updatedLockedAmount = this.stakeData[publicId]?.find((data) => data.lockedEpoch === epoch)?.lockedAmount ?? 0;

        const success = initialLockedAmount !== updatedLockedAmount;

        this._snackBar.open(this.transloco.translate(success ? 'qearn.main.txSuccess' : 'qearn.main.txFailed'), this.transloco.translate('general.close'), {
          duration: 0,
          panelClass: success ? 'success' : 'error',
        });

        this.txSuccessSubject.next(this.pendingStake!);
        this.pendingStake = null;
      });
  }

  public monitorStakeTransaction(publicId: string, initialLockedAmount: number, epoch: number): void {
    this.monitorTransaction(publicId, initialLockedAmount, epoch, epoch, 'stake');
  }

  public monitorUnlockTransaction(publicId: string, initialLockedAmount: number, currentEpoch: number, lockedEpoch: number): void {
    this.monitorTransaction(publicId, initialLockedAmount, lockedEpoch, currentEpoch, 'unlock');
  }
}
