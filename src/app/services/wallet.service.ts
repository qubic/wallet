import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { bytes32ToString } from 'qubic-ts-library/dist//converter/converter';
import { IConfig, IEncryptedVaultFile, IVaultFile } from '../model/config';
import { IDecodedSeed, ISeed } from '../model/seed';
import { ITx } from '../model/tx';
import { QubicAsset } from './api.model';
import { Router } from '@angular/router';
import { OnReadOpts } from 'net';

@Injectable({
  providedIn: 'root',
  useFactory: () => new WalletService()
})
export class WalletService {
  private runningConfiguration: IConfig;

  private configName = 'wallet-config';
  public privateKey: CryptoKey | null = null;
  public publicKey: CryptoKey | null = null;
  //public seeds: ISeed[] = [];
  //public webBridges: string[] = [];
  public txs: ITx[] = [];
  public configError = false;
  public erroredCOnfig: string = '';
  public shouldExportKey = true;
  

  public isWalletReady = false;

  /** Events start */
  public onConfig: BehaviorSubject<IConfig>;

  /** Events stop */

  /* Keep Track of Wallet Start Process */
  /*
   * this promise is resolved as soon the config is loaded.
   * this can be used e.g. in a guard
   * example function: getLockUnlockRoute
   */
  private _resolveConfigLoaded: (() => void) | null = null;
  private _configLoadedSet: Promise<void> = new Promise<void>((resolve) => {
    this._resolveConfigLoaded = resolve;
  });

  get configLoadedSet(): Promise<void> {
    return this._configLoadedSet;
  }

  setConfigLoaded(): void {
    if (this._resolveConfigLoaded) {
      this._resolveConfigLoaded();
      // Optionally reset the promise for future use
      this._resolveConfigLoaded = null;
    }
  }
  /* Keep Track of Wallet Start Process */

  private rsaAlg = {
    name: 'RSA-OAEP',
    modulusLength: 4096,
    publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
    hash: { name: 'SHA-256' },
  };
  private aesAlg = {
    name: 'AES-GCM',
    length: 256,
    iv: new Uint8Array(12).fill(0),
  };
  private encAlg = {
    name: 'RSA-OAEP',
  };

  constructor(private persistence = true) {
    // create empty configuration
    this.runningConfiguration = {
      seeds: [],
      webBridges: [],
      tickAddition: 10,
      useBridge: (<any>window).require,
      enableBeta: false
    };
    this.onConfig = new BehaviorSubject(this.runningConfiguration);
    this.load();
  }

  private load(): void {
    this.loadConfigFromStorage();
  }

  private async loadConfigFromStorage() {
    if(!this.persistence)
      return;

    const jsonString = localStorage.getItem(this.configName);
    if (jsonString) {
      try {
        const config = JSON.parse(jsonString);
        await this.loadConfig(config);
      } catch (e) {
        this.configError = true;
        this.erroredCOnfig = jsonString;
      }
    }
    this.onConfig.next(this.runningConfiguration);
    this.setConfigLoaded(); // resolve config loaded promise
  }

  /**
   * this will resolve as soon the walletservice configuration has loaded and the state is valid
   *
   * @param router the angular router
   * @returns
   */
  public async getLockUnlockRoute(router: Router) {
    await this.configLoadedSet; // wait until config is loaded
    if (!this.isWalletReady && !this.publicKey) {
      if (this.getSeeds().length > 0) {
        return router.parseUrl('/unlock');
      } else {
        return router.parseUrl('/public');
      }
    }
    return true;
  }

  private async loadConfig(config: IConfig) {
    this.runningConfiguration = config;

    // backward compatibility
    if (!this.runningConfiguration.tickAddition)
      this.runningConfiguration.tickAddition = 20;

    // convert json key to internal cryptokey
    if (this.runningConfiguration.publicKey) {
      const k = await crypto.subtle.importKey(
        'jwk',
        this.runningConfiguration.publicKey,
        this.rsaAlg,
        true,
        ['encrypt']
      );
      this.publicKey = k;
      this.isWalletReady = true;
    }

    const tempFixedBridgeAddress = 'wss://webbridge.qubic.li';

    if (!this.runningConfiguration.webBridges)
      this.runningConfiguration.webBridges = [];

    // remove legacy entries
    this.runningConfiguration.webBridges =
      this.runningConfiguration.webBridges.filter(
        (f) => f !== 'https://1.b.qubic.li'
      );
    if (this.runningConfiguration.webBridges.length <= 0)
      this.runningConfiguration.webBridges.push(tempFixedBridgeAddress);

    // todo: load web bridges dynamically

    
  }

  public async createNewKeys() {
    const keyPair = await this.generateKey();
    await this.setKeys(keyPair.publicKey, keyPair.privateKey);
  }

  private async save(lock: boolean = false): Promise<void> {
    await this.saveConfig(lock);
  }

  public getWebBridges(): string[] {
    return [...this.runningConfiguration.webBridges];
  }

  public getRandomWebBridgeUrl(): string {
    return this.runningConfiguration.webBridges[
      Math.floor(Math.random() * this.runningConfiguration.webBridges.length)
    ];
  }

  public getSettings(): IConfig {
    return {
      seeds: [...this.runningConfiguration.seeds],
      webBridges: [...this.runningConfiguration.webBridges],
      useBridge: this.runningConfiguration.useBridge,
      tickAddition: this.runningConfiguration.tickAddition,
      enableBeta: this.runningConfiguration.enableBeta,
    };
  }

  public getName() {
    return this.runningConfiguration.name;
  }

  public async updateName(name: string) {
    this.runningConfiguration.name = name;
    await this.saveConfig(false);
  }

  public async updateConfig(config: any): Promise<void> {
    if (config.tickAddition !== undefined)
      this.runningConfiguration.tickAddition = config.tickAddition;
    if (config.enableBeta !== undefined)
      this.runningConfiguration.enableBeta = config.enableBeta;
    if (config.useBridge !== undefined)
      this.runningConfiguration.useBridge = config.useBridge;
    await this.saveConfig(false);
  }

  public getSeeds(): ISeed[] {
    const seeds = [...this.runningConfiguration.seeds];
    return seeds.sort((a, b) => {
      const nameA = a.alias.toUpperCase(); // ignore upper and lowercase
      const nameB = b.alias.toUpperCase(); // ignore upper and lowercase
      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }

      // names must be equal
      return 0;
    });
  }
  public getSeed(publicId: string): ISeed | undefined {
    return this.runningConfiguration.seeds.find((f) => f.publicId === publicId);
  }

  public async revealSeed(publicId: string): Promise<string> {
    const seed = this.getSeed(publicId);
    try {
      const decryptedSeed = await this.decrypt(
        this.privateKey!,
        this.base64ToArrayBuffer(seed?.encryptedSeed!)
      );
      return new TextDecoder().decode(decryptedSeed);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  public async updateSeedAlias(publicId: string, alias: string) {
    let seed = this.getSeed(publicId);
    if (seed) {
      seed.alias = alias;
      await this.saveConfig(false);
    }
  }

  public async updateBalance(
    publicId: string,
    balance: number,
    balanceTick: number
  ) {
    let seed = this.getSeed(publicId);
    if (seed && (!seed.balanceTick || seed.balanceTick < balanceTick)) {
      seed.balance = balance;
      seed.balanceTick = balanceTick;
      seed.lastUpdate = new Date();
      await this.saveConfig(false);
    }
  }

  
  /**
   * remove assets that are no longer updated
   * @param referenceTick the tick from which on we consider an asset as old
   */
  public async removeOldAssets(referenceTick: number) {
    this.runningConfiguration.seeds.forEach(seed => {
      seed.assets = seed.assets?.filter(f => f.tick >= referenceTick)
    });
    await this.save();
  }

  public async updateAssets(publicId: string, assets: QubicAsset[]) {
    let seed = this.getSeed(publicId);

    if (!seed) return;

    seed.assets = assets;

    // remove lost assets
    seed.assets = seed?.assets?.filter((f) =>
      assets.find((q) => q.contractIndex == f.contractIndex)
    );

    await this.saveConfig(false);
  }

  arrayBufferToBase64(buffer: ArrayBuffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  base64ToArrayBuffer(base64: string) {
    const binary_string = atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }

  public addSeed(seed: IDecodedSeed): Promise<ISeed> {
    return this.encrypt(seed.seed).then((encryptedSeed) => {
      const newSeed = <ISeed>{
        encryptedSeed: btoa(
          String.fromCharCode(...new Uint8Array(encryptedSeed))
        ),
        alias: seed.alias,
        publicId: seed.publicId,
      };
      this.runningConfiguration.seeds.push(newSeed);
      this.save();
      return newSeed;
    });
  }

  deleteSeed(publicId: string) {
    this.runningConfiguration.seeds = this.runningConfiguration.seeds.filter(
      (f) => f.publicId !== publicId
    );
    this.save();
  }

  private async generateKey() {
    const key = await crypto.subtle.generateKey(this.rsaAlg, true, [
      'encrypt',
      'decrypt',
    ]);
    return key;
  }

  private async decrypt(
    privateKey: CryptoKey,
    message: ArrayBuffer
  ): Promise<ArrayBuffer> {
    const msg = await crypto.subtle.decrypt(this.encAlg, privateKey, message);
    return msg;
  }

  private async encrypt(message: string): Promise<ArrayBuffer> {
    return crypto.subtle
      .encrypt(this.encAlg, this.publicKey!, new TextEncoder().encode(message))
      .then((emessage) => {
        return emessage;
      });
  }

  private async saveConfig(lock: boolean) {
    if(!this.persistence)
      return;
    if (lock) {
      // when locking we don't want that the public key is saved.
      this.runningConfiguration.publicKey = undefined;
      localStorage.setItem(
        this.configName,
        JSON.stringify(this.runningConfiguration)
      );
    } else {
      try {
        const jwk = await crypto.subtle.exportKey('jwk', this.publicKey!);
        this.runningConfiguration.publicKey = jwk;
        localStorage.setItem(
          this.configName,
          JSON.stringify(this.runningConfiguration)
        );
      } catch (e) {
        // ignore
      }
    }
    this.onConfig.next(this.runningConfiguration);
  }

  public async lock() {
    await this.save(true);
    this.privateKey = null;
    this.publicKey = null;
  }

  private async setKeys(
    publicKey: CryptoKey,
    privateKey: CryptoKey | null = null
  ) {
    this.publicKey = publicKey;
    // also push the current publickey to the running configuration
    const jwk = await crypto.subtle.exportKey('jwk', this.publicKey!);
    this.runningConfiguration.publicKey = jwk;

    if (privateKey) this.privateKey = privateKey;
  }

  public async importVault(
    binaryVaultFile: ArrayBuffer /* encrypted vault file */,
    password: string
  ): Promise<boolean> {
    if (!this.isVaultFile(binaryVaultFile))
      return Promise.reject('INVALID VAULT FILE');

    try {
      // unlock
      await this.unlockVault(binaryVaultFile, password);

      const vault = await this.convertBinaryVault(binaryVaultFile, password);

      // import configuration
      await this.importConfig(vault.configuration);

      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * converts the binary vault file to the internal vault file format (uploaded by the user)
   * @param binaryVaultFile
   * @param password
   * @returns
   */
  private async convertBinaryVault(
    binaryVaultFile: ArrayBuffer /* encrypted vault file */,
    password: string
  ): Promise<IVaultFile> {
    try {
      const enc = new TextDecoder('utf-8');
      const encryptedVaultFile = JSON.parse(
        enc.decode(binaryVaultFile)
      ) as IEncryptedVaultFile;
      const decryptedVaultFile = await this.decryptVault(
        encryptedVaultFile,
        password
      );

      return decryptedVaultFile;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * unlocks the wallet from a vault file
   *
   * @param binaryVaultFile
   * @param password
   * @returns
   */
  public async unlockVault(
    binaryVaultFile: ArrayBuffer /* encrypted vault file */,
    password: string
  ): Promise<boolean> {
    if (!this.isVaultFile(binaryVaultFile))
      return Promise.reject('INVALID VAULT FILE');

    try {
      const decryptedVaultFile = await this.convertBinaryVault(
        binaryVaultFile,
        password
      );
      const privKey = this.base64ToArrayBuffer(decryptedVaultFile.privateKey);

      const { privateKey, publicKey } = await this.importEncryptedPrivateKey(
        privKey,
        password
      );

      this.shouldExportKey = false;
      await this.setKeys(publicKey, privateKey);
      await this.save();

      return true;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * OBSOLETE legacy
   * @param data
   * @param password
   * @returns
   */
  public async unlock(data: ArrayBuffer, password: string): Promise<boolean> {
    const { privateKey, publicKey } = await this.importEncryptedPrivateKey(data, password);
    this.shouldExportKey = false;
    await this.setKeys(publicKey, privateKey);
    await this.save();
    return true;
  }

  async getPublicKey(privateKey: CryptoKey) {
    const jwkPrivate = await crypto.subtle.exportKey('jwk', privateKey);
    delete jwkPrivate.d;
    jwkPrivate.key_ops = ['encrypt'];
    return crypto.subtle.importKey('jwk', jwkPrivate, this.rsaAlg, true, [
      'encrypt',
    ]);
  }

  async importEncryptedPrivateKey(
    wrappedKey: ArrayBuffer,
    password: string
  ): Promise<{ privateKey: CryptoKey; publicKey: CryptoKey }> {
    return this.importKey(password).then((pwKey: CryptoKey) => {
      return this.deriveKey(pwKey).then((wrapKey: CryptoKey) => {
        return crypto.subtle
          .unwrapKey(
            'jwk',
            wrappedKey,
            wrapKey,
            this.aesAlg,
            this.rsaAlg,
            true,
            ['decrypt']
          )
          .then((privateKey) => {
            return this.getPublicKey(privateKey).then((publicKey) => {
              return { privateKey, publicKey };
            });
          });
      });
    });
  }

  private async importKey(password: string) {
    const enc = new TextEncoder();
    const pw = enc.encode(password);

    return (<any>crypto.subtle).importKey(
      'raw',
      pw,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
  }

  private async deriveKey(pwKey: CryptoKey) {
    const salt = new Uint8Array(16).fill(0);
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      pwKey,
      this.aesAlg,
      true,
      ['wrapKey', 'unwrapKey']
    );
  }

  private bytesToString(bytes: Uint8Array): string {
    return new TextDecoder().decode(bytes);
  }

  private stringToBytes(str: string): Uint8Array {
    return new TextEncoder().encode(str);
  }

  private bytesToBase64(arr: Uint8Array): string {
    return btoa(Array.from(arr, (b) => String.fromCharCode(b)).join(''));
  }

  private base64ToBytes(base64: string): Uint8Array {
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  }

  private async getVaultFileKey(password: string, salt: any) {
    const passwordBytes = this.stringToBytes(password);

    const initialKey = await crypto.subtle.importKey(
      'raw',
      passwordBytes,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      initialKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private async encryptVault(
    vaultFile: IVaultFile,
    password: string
  ): Promise<IEncryptedVaultFile> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await this.getVaultFileKey(password, salt);

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const contentBytes = this.stringToBytes(JSON.stringify(vaultFile));

    const cipher = new Uint8Array(
      await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, contentBytes)
    );

    return {
      salt: this.bytesToBase64(salt),
      iv: this.bytesToBase64(iv),
      cipher: this.bytesToBase64(cipher),
    };
  }

  private async decryptVault(
    encryptedData: IEncryptedVaultFile,
    password: string
  ): Promise<IVaultFile> {
    const salt = this.base64ToBytes(encryptedData.salt);

    const key = await this.getVaultFileKey(password, salt);

    const iv = this.base64ToBytes(encryptedData.iv);

    const cipher = this.base64ToBytes(encryptedData.cipher);

    const contentBytes = new Uint8Array(
      await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher)
    );
    const decryptedVault = this.bytesToString(contentBytes);
    return JSON.parse(decryptedVault);
  }

  /**
   * checks if the provided file is of the new vault file format or not
   */
  public isVaultFile(binaryFile: ArrayBuffer): boolean {
    try {
      const enc = new TextDecoder('utf-8');
      const jsonData = enc.decode(binaryFile);
      const vaultFile = JSON.parse(jsonData) as IEncryptedVaultFile;
      return (
        vaultFile !== undefined &&
        vaultFile.cipher !== undefined &&
        vaultFile.iv !== undefined &&
        vaultFile.salt !== undefined
      );
    } catch (error) {
      return false;
    }
  }

  public async exportVault(password: string): Promise<boolean> {
    if (!this.privateKey || !this.runningConfiguration.publicKey)
      return Promise.reject('Private- or PublicKey not loaded');

    const jsonKey = await this.createJsonKey(password);
    if (jsonKey === null) {
      return Promise.reject('JSONKEY IS NULL');
    }

    const vaultFile: IVaultFile = {
      privateKey: this.arrayBufferToBase64(jsonKey),
      publicKey: this.runningConfiguration.publicKey!,
      configuration: this.prepareConfigExport(),
    };

    const encryptedVaultFile = await this.encryptVault(vaultFile, password);

    const fileData = new TextEncoder().encode(
      JSON.stringify(encryptedVaultFile)
    );
    const blob = new Blob([fileData], { type: 'application/octet-stream' });
    const name = this.runningConfiguration.name ?? 'qubic-config-addresses';
    this.downloadBlob(name + '.qubic-vault', blob);
    this.shouldExportKey = false;

    await this.markSeedsAsSaved();

    return true;
  }

  private async createJsonKey(password: string): Promise<ArrayBuffer | null> {
    if (!this.privateKey) return Promise.resolve<ArrayBuffer | null>(null);

    const pwKey = await this.importKey(password);
    const wrapKey = await this.deriveKey(pwKey);
    const jsonKey = await crypto.subtle.wrapKey(
      'jwk',
      this.privateKey!,
      wrapKey,
      this.aesAlg
    );

    return jsonKey;
  }

  /**
   * OBSOLETE!!! don't use this anymore!
   * @param password
   * @returns
   */
  public async exportKey(password: string) {
    if (!this.privateKey) return Promise.resolve();

    const jsonKey = await this.createJsonKey(password);

    if (jsonKey === null) {
      console.error('KEY NULL');
      return Promise.resolve();
    }

    const blob = new Blob([jsonKey], { type: 'application/octet-stream' });
    this.downloadBlob('qubic-wallet.vault', blob);
    this.shouldExportKey = false;
  }

  public async importConfig(config: IConfig): Promise<boolean> {
    if (!config || config.seeds.length <= 0) return false;

    await this.loadConfig(config);
    await this.saveConfig(false);

    return true;
  }

  private prepareConfigExport(): IConfig {
    const exportConfig: IConfig = {
      name: this.runningConfiguration.name,
      seeds: this.runningConfiguration.seeds.map((m) => {
        const exportSeed: ISeed = <ISeed>{};
        Object.assign(exportSeed, m);
        // reset states balance
        exportSeed.balanceTick = 0;
        exportSeed.lastUpdate = undefined;
        exportSeed.isExported = true;
        return exportSeed;
      }),
      webBridges: this.runningConfiguration.webBridges,
      useBridge: this.runningConfiguration.useBridge,
      tickAddition: this.runningConfiguration.tickAddition,
      enableBeta: this.runningConfiguration.enableBeta
    };
    return exportConfig;
  }

  private async markSeedsAsSaved() {
    // mark seeds as saved/exported
    this.runningConfiguration.seeds.forEach((seed) => {
      seed.isExported = true;
    });
    await this.saveConfig(false);
  }

  // OBSOLETE: LEGACY!!!
  public async exportConfig(): Promise<boolean> {
    if (
      !this.runningConfiguration.seeds ||
      this.runningConfiguration.seeds.length <= 0
    )
      return false;

    const exportConfig = this.prepareConfigExport();

    const data = new TextEncoder().encode(JSON.stringify(exportConfig));
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const name = this.runningConfiguration.name ?? 'qubic-config-addresses';
    this.downloadBlob(name + '.qubic-wallet-config', blob);

    await this.markSeedsAsSaved();

    return true;
  }

  private downloadBlob(fileName: string, blob: Blob): void {
    if ((<any>window.navigator).msSaveOrOpenBlob) {
      (<any>window.navigator).msSaveBlob(blob, fileName);
    } else {
      const anchor = window.document.createElement('a');
      anchor.href = window.URL.createObjectURL(blob);
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(anchor.href);
    }
  }

  public clearConfig() {
    localStorage.removeItem(this.configName);
    this.runningConfiguration.seeds = [];
    this.publicKey = null;
    this.isWalletReady = false;
  }

  public resetConfig() {
    this.clearConfig();
    location.reload();
  }

  private arrayBufferToString(buff: ArrayBuffer) {
    return String.fromCharCode.apply(
      null,
      new Uint16Array(buff) as unknown as number[]
    );
  }

  private stringToArrayBuffer(str: string) {
    const buff = new ArrayBuffer(str.length * 2); // Because there are 2 bytes for each char.
    const buffView = new Uint16Array(buff);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
      buffView[i] = str.charCodeAt(i);
    }
    return buff;
  }
}
