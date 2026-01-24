import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { WalletService } from 'src/app/services/wallet.service';

@Component({
  selector: 'app-settings-support',
  templateUrl: './support.component.html',
  styleUrls: ['./support.component.scss']
})
export class SettingsSupportComponent {

  public discordUrl = 'https://discord.com/channels/768887649540243497/1029858434117550170';
  public githubUrl = 'https://github.com/qubic/wallet/issues/new';

  constructor(
    private router: Router,
    private walletService: WalletService
  ) {
    // Redirect if wallet not ready (authentication guard)
    if (!this.walletService.isWalletReady) {
      this.router.navigate(['/public']);
    }
  }

  public openExternalLink(url: string): void {
    window.open(url, '_blank');
  }
}
