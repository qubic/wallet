import { Injectable } from '@angular/core';
import { ApiService } from '../services/api.service';
import { lastValueFrom } from 'rxjs';
import { WalletService } from './wallet.service';

interface LockInfoPerEpoch {
  lockAmount: number;
  bonusAmount: number;
  currentLockedAmount: number;
  currentBonusAmount: number;
  finalLockedAmount: number;
  finalBonusAmount: number;
  yieldPercentage: number;
}

@Injectable({
  providedIn: 'root',
})
export class QearnService {
  public epochInfo: { [key: number]: LockInfoPerEpoch } = {};
  constructor(private apiService: ApiService, private walletService: WalletService) {}

  public async fetchAllLockInfoFromCurrentEpoch(epoch: number) {
    for (let idx = 0; idx < 52; idx++) {
      const epochInfo = await this.getLockInfoPerEpoch(epoch - idx);
      this.epochInfo[epoch - idx] = epochInfo;
    }
  }

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
      return { lockAmount: 0, bonusAmount: 0, currentLockedAmount: 0, currentBonusAmount: 0, finalLockedAmount: 0, finalBonusAmount: 0, yieldPercentage: 0 };
    }
    const responseBuffer = this.walletService.base64ToArrayBuffer(res.responseData);

    const dataView = new DataView(responseBuffer);
    const lockAmount = Number(dataView.getBigUint64(0, true));
    const bonusAmount = Number(dataView.getBigUint64(8, true));
    const currentLockedAmount = Number(dataView.getBigUint64(16, true));
    const currentBonusAmount = Number(dataView.getBigUint64(24, true));
    const finalLockedAmount = Number(dataView.getBigUint64(32, true));
    const finalBonusAmount = Number(dataView.getBigUint64(40, true));
    const yieldPercentage = Number(dataView.getBigUint64(48, true));

    return { lockAmount, bonusAmount, currentLockedAmount, currentBonusAmount, finalLockedAmount, finalBonusAmount, yieldPercentage };
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
}
