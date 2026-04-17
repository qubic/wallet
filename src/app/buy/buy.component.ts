import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { WalletService } from '../services/wallet.service';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-buy',
  templateUrl: './buy.component.html',
  styleUrls: ['./buy.component.scss'],
})
export class BuyComponent implements OnInit, OnDestroy {
  public banxaUrl: SafeResourceUrl | null = null;
  public selectedAddress = '';

  private readonly destroy$ = new Subject<void>();
  private readonly banxaBaseUrl = environment.banxaUrl;

  constructor(
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private themeService: ThemeService,
    public walletService: WalletService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.selectedAddress = this.getInitialAddress(params['publicId']);
      this.buildUrl();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getWritableSeeds() {
    return this.walletService.getSeeds().filter((seed) => !seed.isOnlyWatch);
  }

  getSelectedSeed() {
    return this.getWritableSeeds().find((seed) => seed.publicId === this.selectedAddress);
  }

  onAddressChange(): void {
    this.buildUrl();
  }

  private getInitialAddress(requestedAddress?: string): string {
    if (requestedAddress && this.isWritableSeed(requestedAddress)) {
      return requestedAddress;
    }

    return this.getWritableSeeds()[0]?.publicId ?? '';
  }

  private isWritableSeed(publicId: string): boolean {
    return this.getWritableSeeds().some((seed) => seed.publicId === publicId);
  }

  private buildUrl(): void {
    if (!this.selectedAddress) {
      this.banxaUrl = null;
      return;
    }

    const params = new URLSearchParams({
      coinType: 'QUBIC',
      blockchain: 'QUBIC',
      fiatType: 'USD',
      walletAddress: this.selectedAddress,
      theme: this.themeService.isDarkTheme ? 'dark' : 'light',
      returnUrl: window.location.origin,
    });
    const url = `${this.banxaBaseUrl}?${params.toString()}`;
    this.banxaUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
