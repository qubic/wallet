import { ChangeDetectorRef, Component, HostListener, Inject, OnDestroy, Renderer2 } from '@angular/core';
import { WalletService } from 'src/app/services/wallet.service';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ThemeService } from 'src/app/services/theme.service';
import { QubicDialogWrapper } from 'src/app/core/dialog-wrapper/dialog-wrapper';


@Component({
  selector: 'qli-reveal-seed',
  templateUrl: './reveal-seed.component.html',
  styleUrls: ['./reveal-seed.component.scss']
})
export class RevealSeedDialog extends QubicDialogWrapper implements OnDestroy {
  public s = '';
  public addressAlias = '';
  public isRevealed = false;
  public qrCodeSize = 256;
  // Fake seed for blurred placeholder (55 chars, looks realistic but contains no real data)
  public readonly fakeSeed = 'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabc';

  private autoHideTimer: any;
  private readonly AUTO_HIDE_DELAY = 60000; // 60 seconds

  constructor(
    renderer: Renderer2,
    themeService: ThemeService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private chgd: ChangeDetectorRef,
    private walletService: WalletService,
    private _snackBar: MatSnackBar
  ) {
    super(renderer, themeService);

    // QR code size: proportional to viewport, smaller on mobile
    const MIN_QR_SIZE = 120;
    const MAX_QR_SIZE = 256;
    const ratio = window.innerWidth <= 400 ? 0.38 : 0.55;
    this.qrCodeSize = Math.min(Math.max(Math.floor(window.innerWidth * ratio), MIN_QR_SIZE), MAX_QR_SIZE);

    if (data?.publicId) {
      this.walletService.revealSeed(data.publicId).then(s => {
        this.s = s;
        this.chgd.detectChanges();
      }).catch(err => {
        this._snackBar.open('Error revealing seed: ' + (err?.message || err), 'Close', { duration: 5000 });
      });
      this.addressAlias = this.walletService.getSeed(data.publicId)?.alias ?? '';
    }
  }

  @HostListener('window:blur')
  onWindowBlur() {
    if (this.isRevealed) {
      this.isRevealed = false;
      this.clearAutoHideTimer();
    }
  }

  toggleReveal() {
    this.isRevealed = !this.isRevealed;

    if (this.isRevealed) {
      this.startAutoHideTimer();
    } else {
      this.clearAutoHideTimer();
    }
  }

  private startAutoHideTimer() {
    this.clearAutoHideTimer();
    this.autoHideTimer = setTimeout(() => {
      this.isRevealed = false;
      this.chgd.detectChanges();
    }, this.AUTO_HIDE_DELAY);
  }

  private clearAutoHideTimer() {
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }
  }

  ngOnDestroy() {
    this.clearAutoHideTimer();
  }
}