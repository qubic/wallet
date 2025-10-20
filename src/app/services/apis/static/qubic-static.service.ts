import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, retry, shareReplay, tap } from 'rxjs/operators';
import {
  StaticSmartContract,
  GetSmartContractsResponse,
  Exchange,
  GetExchangesResponse,
  AddressLabel,
  GetAddressLabelsResponse,
  Token,
  GetTokensResponse
} from './qubic-static.model';
import { environment } from '../../../../environments/environment';

/**
 * Service for fetching static reference data from static.qubic.org
 *
 * This service provides access to:
 * - Smart contract information
 * - Exchange addresses
 * - Address labels (named addresses)
 * - Token information
 *
 * Data is cached in memory and refreshed periodically.
 * In development, uses local proxy to avoid CORS issues.
 */
@Injectable({
  providedIn: 'root'
})
export class QubicStaticService {
  private readonly BASE_URL = `${environment.staticApiUrl}/v1/general/data`;
  private readonly CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

  // BehaviorSubjects for reactive access to cached data
  public smartContracts$: BehaviorSubject<StaticSmartContract[] | null> = new BehaviorSubject<StaticSmartContract[] | null>(null);
  public exchanges$: BehaviorSubject<Exchange[] | null> = new BehaviorSubject<Exchange[] | null>(null);
  public addressLabels$: BehaviorSubject<AddressLabel[] | null> = new BehaviorSubject<AddressLabel[] | null>(null);
  public tokens$: BehaviorSubject<Token[] | null> = new BehaviorSubject<Token[] | null>(null);

  // Cache timestamps
  private smartContractsLastFetch: number = 0;
  private exchangesLastFetch: number = 0;
  private addressLabelsLastFetch: number = 0;
  private tokensLastFetch: number = 0;

  // Observable cache for deduplication
  private smartContractsCache$?: Observable<StaticSmartContract[]>;
  private exchangesCache$?: Observable<Exchange[]>;
  private addressLabelsCache$?: Observable<AddressLabel[]>;
  private tokensCache$?: Observable<Token[]>;

  constructor(private http: HttpClient) {
    // Initialize data fetching
    this.fetchAllData();
  }

  /**
   * Fetch all static data on service initialization
   */
  private fetchAllData(): void {
    this.getSmartContracts().subscribe();
    this.getExchanges().subscribe();
    this.getAddressLabels().subscribe();
    this.getTokens().subscribe();
  }

  /**
   * Get smart contracts with caching
   */
  public getSmartContracts(): Observable<StaticSmartContract[]> {
    const now = Date.now();

    // Return cached observable if still valid
    if (this.smartContractsCache$ && (now - this.smartContractsLastFetch) < this.CACHE_DURATION_MS) {
      return this.smartContractsCache$;
    }

    // Create new observable and cache it
    this.smartContractsCache$ = this.http
      .get<GetSmartContractsResponse>(`${this.BASE_URL}/smart_contracts.json`)
      .pipe(
        retry({ count: 3, delay: 1000 }), // Retry up to 3 times with 1 second delay
        map(response => response.smart_contracts),
        tap(data => {
          this.smartContracts$.next(data);
          this.smartContractsLastFetch = now;
        }),
        catchError(error => {
          console.error('Error fetching smart contracts:', error);
          // Don't update timestamp on error to allow retry on next call
          return of(this.smartContracts$.value || []);
        }),
        shareReplay(1)
      );

    return this.smartContractsCache$;
  }

  /**
   * Get exchanges with caching
   */
  public getExchanges(): Observable<Exchange[]> {
    const now = Date.now();

    if (this.exchangesCache$ && (now - this.exchangesLastFetch) < this.CACHE_DURATION_MS) {
      return this.exchangesCache$;
    }

    this.exchangesCache$ = this.http
      .get<GetExchangesResponse>(`${this.BASE_URL}/exchanges.json`)
      .pipe(
        retry({ count: 3, delay: 1000 }),
        map(response => response.exchanges),
        tap(data => {
          this.exchanges$.next(data);
          this.exchangesLastFetch = now;
        }),
        catchError(error => {
          console.error('Error fetching exchanges:', error);
          return of(this.exchanges$.value || []);
        }),
        shareReplay(1)
      );

    return this.exchangesCache$;
  }

  /**
   * Get address labels with caching
   */
  public getAddressLabels(): Observable<AddressLabel[]> {
    const now = Date.now();

    if (this.addressLabelsCache$ && (now - this.addressLabelsLastFetch) < this.CACHE_DURATION_MS) {
      return this.addressLabelsCache$;
    }

    this.addressLabelsCache$ = this.http
      .get<GetAddressLabelsResponse>(`${this.BASE_URL}/address_labels.json`)
      .pipe(
        retry({ count: 3, delay: 1000 }),
        map(response => response.address_labels),
        tap(data => {
          this.addressLabels$.next(data);
          this.addressLabelsLastFetch = now;
        }),
        catchError(error => {
          console.error('Error fetching address labels:', error);
          return of(this.addressLabels$.value || []);
        }),
        shareReplay(1)
      );

    return this.addressLabelsCache$;
  }

  /**
   * Get tokens with caching
   */
  public getTokens(): Observable<Token[]> {
    const now = Date.now();

    if (this.tokensCache$ && (now - this.tokensLastFetch) < this.CACHE_DURATION_MS) {
      return this.tokensCache$;
    }

    this.tokensCache$ = this.http
      .get<GetTokensResponse>(`${this.BASE_URL}/tokens.json`)
      .pipe(
        retry({ count: 3, delay: 1000 }),
        map(response => response.tokens),
        tap(data => {
          this.tokens$.next(data);
          this.tokensLastFetch = now;
        }),
        catchError(error => {
          console.error('Error fetching tokens:', error);
          return of(this.tokens$.value || []);
        }),
        shareReplay(1)
      );

    return this.tokensCache$;
  }

  /**
   * Force refresh all data by clearing cache
   */
  public refreshAllData(): void {
    this.smartContractsLastFetch = 0;
    this.exchangesLastFetch = 0;
    this.addressLabelsLastFetch = 0;
    this.tokensLastFetch = 0;

    this.smartContractsCache$ = undefined;
    this.exchangesCache$ = undefined;
    this.addressLabelsCache$ = undefined;
    this.tokensCache$ = undefined;

    this.fetchAllData();
  }

  /**
   * Get current cached values (synchronous access)
   */
  public get cachedSmartContracts(): StaticSmartContract[] | null {
    return this.smartContracts$.value;
  }

  public get cachedExchanges(): Exchange[] | null {
    return this.exchanges$.value;
  }

  public get cachedAddressLabels(): AddressLabel[] | null {
    return this.addressLabels$.value;
  }

  public get cachedTokens(): Token[] | null {
    return this.tokens$.value;
  }
}
