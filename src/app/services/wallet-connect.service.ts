import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

declare const Core: any; // WalletConnect Core global verfügbar
declare const WalletKit: any; // WalletKit global verfügbar

@Injectable({
  providedIn: 'root',
})
export class WalletConnectService {
  private walletKit: any;
  private projectId = environment.projektId;

  async initializeWalletKit() {
    const core = new Core({
      projectId: this.projectId,
    });

    this.walletKit = await WalletKit.init({
      core,
      metadata: {
        name: 'Qubic Wallet',
        description: 'WalletConnect Integration',
        url: 'https://wallet.qubic.org',
        icons: [],
      },
    });

    console.log('WalletKit initialized:', this.walletKit);
  }

  async connectWallet() {
    if (!this.walletKit) {
      throw new Error('WalletKit is not initialized.');
    }
    const result = await this.walletKit.connect();
    console.log('Wallet connected:', result);
    return result;
  }

  async disconnectWallet() {
    if (!this.walletKit) {
      throw new Error('WalletKit is not initialized.');
    }
    await this.walletKit.disconnect();
    console.log('Wallet disconnected.');
  }
}
