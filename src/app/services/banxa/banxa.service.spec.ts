import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { BanxaService } from './banxa.service';

describe('BanxaService', () => {
  let service: BanxaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [BanxaService],
    });

    service = TestBed.inject(BanxaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('builds quote requests against the proxy contract', () => {
    service
      .getQuote({
        fiatCode: 'USD',
        fiatAmount: 100,
        coinCode: 'QUBIC',
        blockchain: 'QUBIC',
        walletAddress: 'ADDRESS123',
        paymentMethodId: 'card',
      })
      .subscribe((quote) => {
        expect(quote.coinCode).toBe('QUBIC');
      });

    const request = httpMock.expectOne(
      (req) =>
        req.method === 'GET' &&
        req.url === `${environment.banxaApiUrl}/quotes` &&
        req.params.get('fiatCode') === 'USD' &&
        req.params.get('fiatAmount') === '100' &&
        req.params.get('paymentMethodId') === 'card'
    );

    request.flush({
      data: {
        fiatCode: 'USD',
        fiatAmount: 100,
        coinCode: 'QUBIC',
        coinAmount: 5000,
        price: 50,
        networkFee: 1,
        feeAmount: 2,
        paymentMethodId: 'card',
        blockchain: 'QUBIC',
        walletAddress: 'ADDRESS123',
      },
    });
  });

  it('maps option payloads from the proxy', () => {
    service.getPaymentMethods('USD').subscribe((methods) => {
      expect(methods.length).toBe(1);
      expect(methods[0].id).toBe('card');
    });

    const request = httpMock.expectOne(
      (req) =>
        req.method === 'GET' &&
        req.url === `${environment.banxaApiUrl}/payment-methods` &&
        req.params.get('fiatCode') === 'USD'
    );

    request.flush({
      data: [{ id: 'card', name: 'Credit Card' }],
    });
  });
});
