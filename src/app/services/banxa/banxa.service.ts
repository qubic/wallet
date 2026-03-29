import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  BanxaBuyOrderRequest,
  BanxaBuyOrderResponse,
  BanxaOption,
  BanxaOptionsResponse,
  BanxaPaymentMethod,
  BanxaQuote,
  BanxaQuoteRequest,
  BanxaQuoteResponse,
} from './banxa.model';

@Injectable({
  providedIn: 'root',
})
export class BanxaService {
  private readonly basePath = environment.banxaApiUrl;

  constructor(private httpClient: HttpClient) {}

  getFiats(): Observable<BanxaOption[]> {
    return this.httpClient
      .get<BanxaOptionsResponse<BanxaOption>>(`${this.basePath}/fiats`)
      .pipe(map((response) => response?.data ?? []));
  }

  getCurrencies(): Observable<BanxaOption[]> {
    return this.httpClient
      .get<BanxaOptionsResponse<BanxaOption>>(`${this.basePath}/currencies`)
      .pipe(map((response) => response?.data ?? []));
  }

  getPaymentMethods(fiatCode?: string): Observable<BanxaPaymentMethod[]> {
    let params = new HttpParams();
    if (fiatCode) {
      params = params.set('fiatCode', fiatCode);
    }

    return this.httpClient
      .get<BanxaOptionsResponse<BanxaPaymentMethod>>(`${this.basePath}/payment-methods`, { params })
      .pipe(map((response) => response?.data ?? []));
  }

  getQuote(request: BanxaQuoteRequest): Observable<BanxaQuote> {
    const params = new HttpParams({
      fromObject: {
        fiatCode: request.fiatCode,
        fiatAmount: `${request.fiatAmount}`,
        coinCode: request.coinCode,
        blockchain: request.blockchain,
        walletAddress: request.walletAddress,
        paymentMethodId: request.paymentMethodId,
      },
    });

    return this.httpClient
      .get<BanxaQuoteResponse>(`${this.basePath}/quotes`, { params })
      .pipe(map((response) => response.data));
  }

  createBuyOrder(request: BanxaBuyOrderRequest) {
    return this.httpClient
      .post<BanxaBuyOrderResponse>(`${this.basePath}/orders/buy`, request)
      .pipe(map((response) => response.data));
  }
}
