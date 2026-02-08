import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { WalletService } from '../services/wallet.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-buy',
  templateUrl: './buy.component.html',
  styleUrls: ['./buy.component.scss'],
})
export class BuyComponent implements OnInit {
  public banxaUrl: SafeResourceUrl | null = null;
  public selectedAddress = '';

  private banxaBaseUrl = environment.banxaUrl;

  constructor(
    private sanitizer: DomSanitizer,
    public walletService: WalletService
  ) {}

  ngOnInit(): void {
    this.buildUrl();
  }

  getWritableSeeds() {
    return this.walletService.getSeeds().filter((s) => !s.isOnlyWatch);
  }

  getSelectedSeed() {
    return this.getWritableSeeds().find((s) => s.publicId === this.selectedAddress);
  }

  onAddressChange(): void {
    this.buildUrl();
  }

  private buildUrl(): void {
    const params = new URLSearchParams({
      fiatType: 'USD',
      walletAddress: this.selectedAddress,
      theme: 'dark',
    });
    const url = `${this.banxaBaseUrl}?${params.toString()}`;
    this.banxaUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
