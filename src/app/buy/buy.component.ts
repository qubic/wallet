import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { TranslocoService } from '@ngneat/transloco';
import { combineLatest, EMPTY, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, switchMap, takeUntil, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { BanxaQuote, BanxaQuoteRequest } from '../services/banxa/banxa.model';
import { BanxaService } from '../services/banxa/banxa.service';
import { WalletService } from '../services/wallet.service';

@Component({
  selector: 'app-buy',
  templateUrl: './buy.component.html',
  styleUrls: ['./buy.component.scss'],
})
export class BuyComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly quoteRefresh$ = new Subject<void>();

  public banxaUrl: SafeResourceUrl | null = null;
  public quote: BanxaQuote | null = null;
  public selectedAddress = '';
  public fiats: { code: string; name: string }[] = [];
  public currencies: { code: string; name: string }[] = [];
  public paymentMethods: { id: string; name: string }[] = [];
  public readonly environment = environment;
  public readonly blockchains = [
    { code: environment.banxaDefaultBlockchain, name: environment.banxaDefaultBlockchain },
  ];
  public isLoadingOptions = false;
  public isLoadingQuote = false;
  public isCreatingOrder = false;

  readonly buyForm = this.fb.group({
    fiatAmount: [100, [Validators.required, Validators.min(1)]],
    fiatCode: [environment.banxaDefaultFiat, [Validators.required]],
    coinCode: [environment.banxaDefaultCoin, [Validators.required]],
    blockchain: [environment.banxaDefaultBlockchain, [Validators.required]],
    paymentMethodId: ['', [Validators.required]],
  });

  constructor(
    private fb: FormBuilder,
    private sanitizer: DomSanitizer,
    private snackBar: MatSnackBar,
    private transloco: TranslocoService,
    private route: ActivatedRoute,
    private banxaService: BanxaService,
    public walletService: WalletService
  ) {}

  ngOnInit(): void {
    const writableSeeds = this.getWritableSeeds();
    if (writableSeeds.length > 0) {
      this.selectedAddress = writableSeeds[0].publicId;
    } else {
      this.showError('buyComponent.messages.noWritableAddresses');
    }

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const publicId = params['publicId'];
      if (publicId && this.isWritableSeed(publicId)) {
        this.selectedAddress = publicId;
      }
    });

    this.buyForm.controls.fiatCode.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((fiatCode) => {
      this.loadPaymentMethods(fiatCode || environment.banxaDefaultFiat);
    });

    this.buyForm.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        tap(() => this.resetCheckout()),
        distinctUntilChanged((previous, current) => JSON.stringify(previous) === JSON.stringify(current))
      )
      .subscribe(() => {
        this.requestQuoteRefresh();
      });

    this.quoteRefresh$
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(500),
        switchMap(() => {
          if (!this.selectedAddress || this.buyForm.invalid || this.isLoadingOptions) {
            this.quote = null;
            this.isLoadingQuote = false;
            return EMPTY;
          }

          return this.fetchQuote(false);
        })
      )
      .subscribe();

    this.loadReferenceData();
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
    this.resetCheckout();
    this.requestQuoteRefresh();
  }

  refreshQuote(): void {
    if (!this.selectedAddress) {
      this.showError('buyComponent.messages.missingAddress');
      return;
    }

    if (this.buyForm.invalid) {
      this.buyForm.markAllAsTouched();
      return;
    }

    this.fetchQuote(true).pipe(takeUntil(this.destroy$)).subscribe();
  }

  createOrder(): void {
    if (!this.quote) {
      this.refreshQuote();
      return;
    }

    this.isCreatingOrder = true;

    this.banxaService
      .createBuyOrder({
        ...this.buildQuoteRequest(),
        returnUrl: environment.banxaReturnUrl,
        accountReference: this.selectedAddress,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.banxaUrl = this.sanitizer.bypassSecurityTrustResourceUrl(result.checkoutUrl);
          this.isCreatingOrder = false;
          this.snackBar.open(
            this.transloco.translate('buyComponent.messages.orderCreated'),
            this.transloco.translate('general.close'),
            { duration: 4000 }
          );
        },
        error: () => {
          this.isCreatingOrder = false;
          this.showError('buyComponent.messages.orderFailed');
        },
      });
  }

  resetCheckout(): void {
    this.quote = null;
    this.banxaUrl = null;
  }

  private loadReferenceData(): void {
    this.isLoadingOptions = true;

    combineLatest([
      this.banxaService.getFiats(),
      this.banxaService.getCurrencies(),
      this.banxaService.getPaymentMethods(this.buyForm.controls.fiatCode.value || environment.banxaDefaultFiat),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([fiats, currencies, paymentMethods]) => {
          this.fiats = fiats;
          this.currencies = currencies;
          this.paymentMethods = paymentMethods;

          if (!this.buyForm.controls.fiatCode.value && fiats.length > 0) {
            this.buyForm.controls.fiatCode.setValue(fiats[0].code);
          }
          if (!this.buyForm.controls.coinCode.value && currencies.length > 0) {
            this.buyForm.controls.coinCode.setValue(currencies[0].code);
          }
          if (paymentMethods.length > 0) {
            this.buyForm.controls.paymentMethodId.setValue(paymentMethods[0].id);
          }

          this.isLoadingOptions = false;
          this.requestQuoteRefresh();
        },
        error: () => {
          this.isLoadingOptions = false;
          this.showError('buyComponent.messages.loadingFailed');
        },
      });
  }

  private loadPaymentMethods(fiatCode: string): void {
    this.banxaService
      .getPaymentMethods(fiatCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (paymentMethods) => {
          this.paymentMethods = paymentMethods;
          const selectedPaymentMethod = this.buyForm.controls.paymentMethodId.value;
          if (!selectedPaymentMethod || !paymentMethods.some((method) => method.id === selectedPaymentMethod)) {
            this.buyForm.controls.paymentMethodId.setValue(paymentMethods[0]?.id ?? '');
          }
          this.resetCheckout();
          this.requestQuoteRefresh();
        },
        error: () => {
          this.paymentMethods = [];
          this.buyForm.controls.paymentMethodId.setValue('');
          this.showError('buyComponent.messages.loadingFailed');
        },
      });
  }

  private buildQuoteRequest(): BanxaQuoteRequest {
    return {
      fiatAmount: Number(this.buyForm.controls.fiatAmount.value),
      fiatCode: this.buyForm.controls.fiatCode.value || environment.banxaDefaultFiat,
      coinCode: this.buyForm.controls.coinCode.value || environment.banxaDefaultCoin,
      blockchain: this.buyForm.controls.blockchain.value || environment.banxaDefaultBlockchain,
      walletAddress: this.selectedAddress,
      paymentMethodId: this.buyForm.controls.paymentMethodId.value || '',
    };
  }

  private isWritableSeed(publicId: string) {
    return this.getWritableSeeds().some((seed) => seed.publicId === publicId);
  }

  private requestQuoteRefresh() {
    this.quoteRefresh$.next();
  }

  private fetchQuote(showSuccessMessage: boolean) {
    this.isLoadingQuote = true;
    this.banxaUrl = null;

    return this.banxaService.getQuote(this.buildQuoteRequest()).pipe(
      tap((quote) => {
        this.quote = quote;
        if (showSuccessMessage) {
          this.snackBar.open(
            this.transloco.translate('buyComponent.messages.quoteLoaded'),
            this.transloco.translate('general.close'),
            { duration: 4000 }
          );
        }
      }),
      catchError(() => {
        this.quote = null;
        this.showError('buyComponent.messages.quoteFailed');
        return EMPTY;
      }),
      finalize(() => {
        this.isLoadingQuote = false;
      })
    );
  }

  private showError(key: string) {
    this.snackBar.open(this.transloco.translate(key), this.transloco.translate('general.close'), {
      duration: 8000,
      panelClass: 'error',
    });
  }
}
