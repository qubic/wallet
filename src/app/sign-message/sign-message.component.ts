import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@ngneat/transloco';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WalletService } from '../services/wallet.service';
import { UnLockComponent } from '../lock/unlock/unlock.component';
import Crypto from '@qubic-lib/qubic-ts-library/dist/crypto';
import { QubicHelper } from '@qubic-lib/qubic-ts-library/dist/qubicHelper';
import { KeyHelper } from '@qubic-lib/qubic-ts-library/dist/keyHelper';

@Component({
  selector: 'app-sign-message',
  templateUrl: './sign-message.component.html',
  styleUrls: ['./sign-message.component.scss']
})
export class SignMessageComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  signForm = this.fb.group({
    sourceId: ['', [Validators.required]],
    message: ['', [Validators.required]],
  });

  verifyForm = this.fb.group({
    verifyInput: ['', [Validators.required]],
  });

  signOutput = '';
  isSigning = false;

  verifyResult: 'valid' | 'invalid' | null = null;
  verifyError = '';

  constructor(
    private t: TranslocoService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private _snackBar: MatSnackBar,
    public walletService: WalletService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['publicId']) {
          this.signForm.controls.sourceId.setValue(params['publicId']);
        }
      });

    this.signForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.signOutput = '';
      });

    this.verifyForm.controls.verifyInput.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.verifyResult = null;
        this.verifyError = '';
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getSeeds() {
    return this.walletService.getSeeds().filter(f => !f.isOnlyWatch);
  }

  getSelectedSourceSeed() {
    const publicId = this.signForm.controls.sourceId.value;
    return this.getSeeds().find(s => s.publicId === publicId);
  }

  loadKey() {
    this.dialog.open(UnLockComponent, { restoreFocus: false });
  }

  async onSign() {
    if (!this.walletService.privateKey) {
      const dialogRef = this.dialog.open(UnLockComponent, { restoreFocus: false });
      dialogRef.afterClosed().subscribe(() => {
        if (this.walletService.privateKey) {
          this.onSign();
        }
      });
      return;
    }

    const sourceId = this.signForm.controls.sourceId.value;
    const message = this.signForm.controls.message.value;
    if (!sourceId || !message) return;

    this.isSigning = true;
    this.signOutput = '';

    try {
      const seed = await this.walletService.revealSeed(sourceId);
      const { schnorrq, K12 } = await Crypto;
      const helper = new QubicHelper();
      const idPackage = await helper.createIdPackage(seed);

      const messageBytes = new TextEncoder().encode(message);
      const signature = schnorrq.sign(idPackage.privateKey, idPackage.publicKey, messageBytes);

      const checksumOut = new Uint8Array(1);
      K12(signature, checksumOut, 1);

      const sigWithChecksum = new Uint8Array(65);
      sigWithChecksum.set(signature);
      sigWithChecksum[64] = checksumOut[0];

      const result = {
        identity: idPackage.publicId,
        message: message,
        signature: this.encodeShiftedHex(sigWithChecksum),
      };

      this.signOutput = JSON.stringify(result, null, 2);
    } catch (e) {
      this._snackBar.open(
        this.t.translate('signMessageComponent.messages.signError'),
        this.t.translate('general.close'),
        { duration: 5000, panelClass: 'error' }
      );
    } finally {
      this.isSigning = false;
    }
  }

  async onVerify() {
    this.verifyResult = null;
    this.verifyError = '';

    const input = this.verifyForm.controls.verifyInput.value;
    if (!input) return;

    let parsed: any;
    try {
      parsed = JSON.parse(input);
    } catch {
      this.verifyError = this.t.translate('signMessageComponent.messages.parseError');
      return;
    }

    const { identity, message, signature } = parsed;
    if (!identity || !message || !signature) {
      this.verifyError = this.t.translate('signMessageComponent.messages.parseError');
      return;
    }

    if (!/^[A-Z]{60}$/.test(identity)) {
      this.verifyError = this.t.translate('signMessageComponent.messages.invalidIdentity');
      return;
    }

    const helper = new QubicHelper();
    if (!(await helper.verifyIdentity(identity))) {
      this.verifyError = this.t.translate('signMessageComponent.messages.invalidIdentity');
      return;
    }

    if (!/^[A-Pa-p]{130}$/.test(signature)) {
      this.verifyError = this.t.translate('signMessageComponent.messages.invalidSignature');
      return;
    }

    try {
      const decoded = this.decodeShiftedHex(signature);
      if (decoded.length !== 65) {
        this.verifyError = this.t.translate('signMessageComponent.messages.invalidSignature');
        return;
      }

      const sigBytes = decoded.slice(0, 64);
      const checksum = decoded[64];

      const { schnorrq, K12 } = await Crypto;

      const checksumOut = new Uint8Array(1);
      K12(sigBytes, checksumOut, 1);
      if (checksumOut[0] !== checksum) {
        this.verifyError = this.t.translate('signMessageComponent.messages.checksumMismatch');
        return;
      }

      const publicKeyBytes = KeyHelper.getIdentityBytes(identity);
      const messageBytes = new TextEncoder().encode(message);
      const result = schnorrq.verify(publicKeyBytes, messageBytes, sigBytes);

      this.verifyResult = result === 1 ? 'valid' : 'invalid';
    } catch {
      this.verifyError = this.t.translate('signMessageComponent.messages.signError');
    }
  }

  private encodeShiftedHex(bytes: Uint8Array): string {
    let result = '';
    const A = 'A'.charCodeAt(0);
    for (let i = 0; i < bytes.length; i++) {
      result += String.fromCharCode(A + (bytes[i] >> 4));
      result += String.fromCharCode(A + (bytes[i] & 0x0F));
    }
    return result;
  }

  private decodeShiftedHex(str: string): Uint8Array {
    const upper = str.toUpperCase();
    const A = 'A'.charCodeAt(0);
    const bytes = new Uint8Array(upper.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      const hi = upper.charCodeAt(i * 2) - A;
      const lo = upper.charCodeAt(i * 2 + 1) - A;
      if (hi < 0 || hi > 15 || lo < 0 || lo > 15) {
        throw new Error('Invalid shifted hex character');
      }
      bytes[i] = (hi << 4) | lo;
    }
    return bytes;
  }
}
