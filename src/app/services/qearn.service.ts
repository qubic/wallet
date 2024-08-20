import { Injectable } from '@angular/core';
import { ApiService } from '../services/api.service';
import { lastValueFrom } from 'rxjs';
import { WalletService } from './wallet.service';

interface LockInfoPerEpoch {
  lockAmount: bigint;
  bonusAmount: bigint;
  currentLockedAmount: bigint;
  currentBonusAmount: bigint;
  finalLockedAmount: bigint;
  finalBonusAmount: bigint;
  yieldPercentage: bigint;
}

@Injectable({
  providedIn: 'root',
})
export class QearnService {
  constructor(private apiService: ApiService, private walletService: WalletService) {}

  public async lockQubic(seed: string, amount: bigint, tick: number) {
    const res = await this.apiService.contractTransaction(seed, 1, 0, amount, {}, tick);
    return res;
  }

  public async unLockQubic(seed: string, amount: bigint, epoch: number, tick: number) {
    const res = await this.apiService.contractTransaction(seed, 2, 12, 0n, { UnlockAmount: amount, LockedEpoch: epoch }, tick);
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

    const responseBuffer = this.walletService.base64ToArrayBuffer(res.responseData);

    const dataView = new DataView(responseBuffer);
    const lockAmount = dataView.getBigUint64(0, true);
    const bonusAmount = dataView.getBigUint64(8, true);
    const currentLockedAmount = dataView.getBigUint64(16, true);
    const currentBonusAmount = dataView.getBigUint64(24, true);
    const finalLockedAmount = dataView.getBigUint64(32, true);
    const finalBonusAmount = dataView.getBigUint64(40, true);
    const yieldPercentage = dataView.getBigUint64(48, true);

    return { lockAmount, bonusAmount, currentLockedAmount, currentBonusAmount, finalLockedAmount, finalBonusAmount, yieldPercentage };
  }

  public async getUserLockInfo(user: Uint8Array, epoch: number): Promise<bigint> {
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

    const responseBuffer = this.walletService.base64ToArrayBuffer(res.responseData);

    return new DataView(responseBuffer).getBigUint64(0, true);
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

    const responseBuffer = this.walletService.base64ToArrayBuffer(res.responseData);

    const dataView = new DataView(responseBuffer);
    const state = dataView.getUint32(0, true);

    return { state };
  }
}
