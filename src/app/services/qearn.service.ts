import { Injectable } from '@angular/core';
import { ApiService } from '../services/api.service';
import { lastValueFrom, Subject } from 'rxjs';
import { WalletService } from './wallet.service';
import { PublicKey } from 'qubic-ts-library/dist/qubic-types/PublicKey';
import { REWARD_DATA } from '../qearn/reward-table/table-data';
import { UpdaterService } from './updater-service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@ngneat/transloco';

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

interface PendingStake {
  publicId: string;
  amount: number;
  targetTick: number;
  type: string;
}

@Injectable({
  providedIn: 'root',
})
export class QearnService {
  public epochInfo: { [key: number]: LockInfoPerEpoch } = {};
  public stakeData: { [key: string]: IStakeStatus[] } = {};
  public isLoading = false;
  public pendingStake: PendingStake | null = null;
  public txSuccessSubject = new Subject<any>();
  public selectedPublicId = new Subject<string>();

  constructor(
    private apiService: ApiService, 
    private walletService: WalletService,
    private us: UpdaterService,
    private _snackBar: MatSnackBar,
    private transloco: TranslocoService) {}

  /**
   * Main Query, Transaction Functions
   */
  public async lockQubic(seed: string, amount: number, tick: number) {
    const res = await this.apiService.contractTransaction(seed, 1, 0, amount, {}, tick);
    return res;
  }

  public async unLockQubic(seed: string, amount: number, epoch: number, tick: number) {
    const res = await this.apiService.contractTransaction(seed, 2, 12, 0, { UnlockAmount: amount, LockedEpoch: epoch }, tick);
    return res;
  }

  public async getLockInfoPerEpoch(epoch: number): Promise<LockInfoPerEpoch> {
    const buffer = new ArrayBuffer(4);
    new DataView(buffer).setUint32(0, epoch, true);

    const base64String = this.walletService.arrayBufferToBase64(buffer);

    const res = await lastValueFrom(
      this.apiService.queryStakingData({
        contractIndex: 6,
        inputType: 1,
        inputSize: 4,
        requestData: base64String,
      })
    );
    if (!res.responseData) {
      return { lockAmount: 0, bonusAmount: 0, currentLockedAmount: 0, currentBonusAmount: 0, yieldPercentage: 0 };
    }
    const responseBuffer = this.walletService.base64ToArrayBuffer(res.responseData);

    const dataView = new DataView(responseBuffer);
    const lockAmount = Number(dataView.getBigUint64(0, true));
    const bonusAmount = Number(dataView.getBigUint64(8, true));
    const currentLockedAmount = Number(dataView.getBigUint64(16, true));
    const currentBonusAmount = Number(dataView.getBigUint64(24, true));
    const yieldPercentage = Number(dataView.getBigUint64(32, true));

    return { lockAmount, bonusAmount, currentLockedAmount, currentBonusAmount, yieldPercentage };
  }

  public async getUserLockInfo(user: Uint8Array, epoch: number): Promise<number> {
    const buffer = new ArrayBuffer(36);
    const dataView = new DataView(buffer);

    user.forEach((byte, index) => dataView.setUint8(index, byte));
    dataView.setUint32(32, epoch, true);

    const base64String = this.walletService.arrayBufferToBase64(buffer);

    const res = await lastValueFrom(
      this.apiService.queryStakingData({
        contractIndex: 6,
        inputType: 2,
        inputSize: 36,
        requestData: base64String,
      })
    );

    if (!res.responseData) {
      return 0;
    }
    const responseBuffer = this.walletService.base64ToArrayBuffer(res.responseData);

    return Number(new DataView(responseBuffer).getBigUint64(0, true));
  }

  public async getStateOfRound(epoch: number): Promise<{ state: number }> {
    const buffer = new ArrayBuffer(4);
    new DataView(buffer).setUint32(0, epoch, true);

    const base64String = this.walletService.arrayBufferToBase64(buffer);

    const res = await lastValueFrom(
      this.apiService.queryStakingData({
        contractIndex: 6,
        inputType: 3,
        inputSize: 4,
        requestData: base64String,
      })
    );

    if (!res.responseData) {
      return { state: 0 };
    }
    const responseBuffer = this.walletService.base64ToArrayBuffer(res.responseData);

    const dataView = new DataView(responseBuffer);
    const state = dataView.getUint32(0, true);

    return { state };
  }

  public async getUserLockStatus(user: Uint8Array, currentEpoch: number): Promise<number[]> {
    const buffer = new ArrayBuffer(32);
    const dataView = new DataView(buffer);

    user.forEach((byte, index) => dataView.setUint8(index, byte));

    const base64String = this.walletService.arrayBufferToBase64(buffer);

    const res = await lastValueFrom(
      this.apiService.queryStakingData({
        contractIndex: 6,
        inputType: 4,
        inputSize: 32,
        requestData: base64String,
      })
    );

    if (!res.responseData) {
      return [];
    }
    const responseBuffer = this.walletService.base64ToArrayBuffer(res.responseData);
    const responseView = new DataView(responseBuffer);
    const state = Number(responseView.getBigUint64(0, true));

    const binaryState = state.toString(2);
    const epochs = [];
    for (let i = 0; i <= binaryState.length - 1; i++) {
      if (binaryState[binaryState.length - 1 - i] === '1') {
        epochs.push(currentEpoch - i);
      }
    }
    return epochs;
  }

  /**
   * Utilities
   */
  public async fetchLockInfo(epoch: number) {
    const epochInfo = await this.getLockInfoPerEpoch(epoch);
    this.epochInfo[epoch] = epochInfo;
  }

  public async fetchAllLockInfoFromCurrentEpoch(epoch: number) {
    this.isLoading = true;
    for (let i = 0; i < 52; i++) {
      if (this.epochInfo[epoch - i]) return;
      await this.fetchLockInfo(epoch - i);
    }
    this.isLoading = false;
  }

  public async fetchStakeDataPerEpoch(publicId: string, epoch: number, currentEpoch: number) {
    if (!this.epochInfo[epoch]) {
      await this.fetchLockInfo(epoch);
    }
    const pubKey = new PublicKey(publicId).getPackageData();
    const lockAmount = await this.getUserLockInfo(pubKey, epoch);

    if (lockAmount) {
      if (!this.stakeData[publicId]) {
        this.stakeData[publicId] = [];
      }
      const totalLockedAmountInEpoch = this.epochInfo[epoch].currentLockedAmount;
      const currentBonusAmountInEpoch = this.epochInfo[epoch].currentBonusAmount;
      const yieldPercentage = this.epochInfo[epoch].yieldPercentage;

      const fullUnlockPercent = yieldPercentage / 100000;
      // const fullUnlockRewardRatio = lockAmount / totalLockedAmountInEpoch;
      const fullUnlockReward = currentBonusAmountInEpoch * (lockAmount / totalLockedAmountInEpoch);

      const earlyUnlockPercent = REWARD_DATA.find((data) => data.weekFrom <= currentEpoch - epoch && data.weekTo >= currentEpoch - epoch)?.earlyUnlock || 0;
      // const earlyUnlockRewardRatio = fullUnlockPercent *earlyUnlockPercent /100; //(lockAmount * earlyUnlockPercent) / (100 * totalLockedAmountInEpoch);
      const earlyUnlockReward = currentBonusAmountInEpoch * (lockAmount / totalLockedAmountInEpoch) * (earlyUnlockPercent / 100);

      const existingDataIndex = this.stakeData[publicId].findIndex((data) => data.lockedEpoch === epoch);
      if (existingDataIndex !== -1) {
        this.stakeData[publicId][existingDataIndex] = {
          publicId: publicId,
          lockedEpoch: epoch,
          lockedAmount: lockAmount,
          lockedWeeks: currentEpoch - epoch,
          totalLockedAmountInEpoch: totalLockedAmountInEpoch,
          currentBonusAmountInEpoch: currentBonusAmountInEpoch,
          earlyUnlockReward,
          earlyUnlockRewardRatio: (fullUnlockPercent * earlyUnlockPercent) / 100,
          fullUnlockReward,
          fullUnlockRewardRatio: fullUnlockPercent,
        };
      } else {
        this.stakeData[publicId].push({
          publicId: publicId,
          lockedEpoch: epoch,
          lockedAmount: lockAmount,
          lockedWeeks: currentEpoch - epoch,
          totalLockedAmountInEpoch: totalLockedAmountInEpoch,
          currentBonusAmountInEpoch: currentBonusAmountInEpoch,
          earlyUnlockReward,
          earlyUnlockRewardRatio: (fullUnlockPercent * earlyUnlockPercent) / 100,
          fullUnlockReward,
          fullUnlockRewardRatio: fullUnlockPercent,
        });
      }
    } else {
      this.stakeData[publicId] = this.stakeData[publicId].filter((data) => data.lockedEpoch !== epoch);
    }
  }

  public async fetchStakeDataOfPublicId(publicId: string, currentEpoch: number) {
    this.isLoading = true;
    for (let i = 0; i < 52; i++) {
      if (this.stakeData[publicId]?.find((data) => data.lockedEpoch === currentEpoch - i)) return;
      await this.fetchStakeDataPerEpoch(publicId, currentEpoch - i, currentEpoch);
    }
    this.isLoading = false;
  }

  public setPendingStake(pendingStake: PendingStake | null) {
    this.pendingStake = pendingStake;
  }

  public setLoading(isLoading: boolean) {
    this.isLoading = isLoading;
  }

  monitorStakeTransaction(publicId: string, initialLockedAmount: number, epoch: number): void {
    this.us.currentTick.subscribe(async (tick) => {
      if (this.pendingStake !== null && tick > this.pendingStake.targetTick + 2) {
        await this.fetchStakeDataPerEpoch(publicId, epoch, epoch);
        const updatedLockedAmountOfThisEpoch = this.stakeData[publicId].find((data) => data.lockedEpoch === epoch)?.lockedAmount ?? 0;
        if (initialLockedAmount === updatedLockedAmountOfThisEpoch) {
          this._snackBar.open('Transaction Failed', this.transloco.translate('general.close'), {
            duration: 0,
            panelClass: 'error',
          });
        } else {
          this._snackBar.open('Transaction Successed!', this.transloco.translate('general.close'), {
            duration: 0,
            panelClass: 'success',
          });
        }
        this.pendingStake = null;
        this.txSuccessSubject.next(publicId);
      }
    });
  }

  monitorUnlockTransaction(publicId: string, initialLockedAmount: number, currentEpoch: number, historyComponent: any): void {
    this.us.currentTick.subscribe(async (tick) => {
      if (this.pendingStake !== null && tick > this.pendingStake.targetTick + 1) {
        // Fetch the stake data and check if the transaction was successful
        await this.fetchStakeDataPerEpoch(publicId, historyComponent.lockedEpoch, currentEpoch);
        const updatedLockedAmountOfThisEpoch = this.stakeData[publicId].find((data) => data.lockedEpoch === historyComponent.lockedEpoch)?.lockedAmount ?? 0;
        if (initialLockedAmount === updatedLockedAmountOfThisEpoch) {
          this._snackBar.open('Transaction Failed', this.transloco.translate('general.close'), {
            duration: 0,
            panelClass: 'error',
          });
        } else {
          this._snackBar.open('Transaction Successed!', this.transloco.translate('general.close'), {
            duration: 0,
            panelClass: 'success',
          });
        }
        this.pendingStake = null;
        this.txSuccessSubject.next(publicId);
      }
    });
  }
}
