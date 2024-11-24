import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import WalletKit from '@reown/walletkit';
import { Core } from '@walletconnect/core';

@Injectable({
  providedIn: 'root',
})
export class WalletConnectService {
  private projectId = environment.walletConnectProjectId;
  private url = environment.walletConnectURL;
  private walletInstance: any;
  private core: any;

  constructor() {
    if (!this.projectId) {
      throw new Error('WalletConnect Project ID is not defined.');
    }

    this.core = new Core({
      projectId: this.projectId,
    });

    this.initializeWalletConnect();
  }

  /**
   * Initializes WalletConnect
   */
  initializeWalletConnect() {
    // WalletKit requires core and metadata as options
    this.walletInstance = new WalletKit({
      core: this.core, // <- pass the shared `core` instance
      metadata: {
        name: 'Qubic Wallet',
        description: 'WalletKit WalletConnect example',
        url: this.url,
        icons: [this.url + '/src/assets/Logo_light.webp'],
      }
    });

    console.log('WalletConnect initialized');
  }

  /**
   * Connects the wallet
   */
  async connectWallet() {
    if (!this.walletInstance) {
      throw new Error('WalletConnect is not initialized.');
    }

    const connectionResult = await this.walletInstance.connect();
    console.log('Wallet connected:', connectionResult);
    return connectionResult;
  }

  /**
   * Disconnects the wallet
   */
  async disconnectWallet() {
    if (!this.walletInstance) {
      throw new Error('WalletConnect is not initialized.');
    }

    await this.walletInstance.disconnect();
    console.log('Wallet connection disconnected');
  }

  /**
   * Checks the connection and returns wallet information
   */
  getWalletInfo() {
    if (!this.walletInstance) {
      throw new Error('WalletConnect is not initialized.');
    }

    return this.walletInstance.getInfo();
  }

  /**
   * Allows signing of messages or transactions
   */
  async signTransaction(transaction: any) {
    if (!this.walletInstance) {
      throw new Error('WalletConnect is not initialized.');
    }

    const signedTransaction = await this.walletInstance.signTransaction(transaction);
    console.log('Transaction signed:', signedTransaction);
    return signedTransaction;
  }

  /**
   * Fetches all supported wallets
   */
  async getSupportedWallets() {
    if (!this.walletInstance) {
      throw new Error('WalletConnect is not initialized.');
    }

    const wallets = await this.walletInstance.getWallets();
    console.log('Supported wallets:', wallets);
    return wallets;
  }
}
