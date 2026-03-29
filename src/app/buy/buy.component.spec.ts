import { NO_ERRORS_SCHEMA } from '@angular/core';
import { fakeAsync, ComponentFixture, TestBed, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoService } from '@ngneat/transloco';
import { of } from 'rxjs';
import { BuyComponent } from './buy.component';
import { BanxaService } from '../services/banxa/banxa.service';
import { WalletService } from '../services/wallet.service';

describe('BuyComponent', () => {
  let component: BuyComponent;
  let fixture: ComponentFixture<BuyComponent>;
  let banxaServiceMock: jasmine.SpyObj<BanxaService>;

  const walletServiceMock = {
    getSeeds: () => [
      { publicId: 'ADDR1', isOnlyWatch: false, alias: 'Main', balance: 1, lastUpdate: new Date() },
      { publicId: 'ADDR2', isOnlyWatch: true, alias: 'Watch', balance: 1, lastUpdate: new Date() },
    ],
  };

  const translocoServiceMock = {
    translate: (key: string) => key,
  };

  beforeEach(async () => {
    banxaServiceMock = jasmine.createSpyObj<BanxaService>('BanxaService', [
      'getFiats',
      'getCurrencies',
      'getPaymentMethods',
      'getQuote',
      'createBuyOrder',
    ]);
    banxaServiceMock.getFiats.and.returnValue(of([{ code: 'USD', name: 'US Dollar' }]));
    banxaServiceMock.getCurrencies.and.returnValue(of([{ code: 'QUBIC', name: 'Qubic' }]));
    banxaServiceMock.getPaymentMethods.and.returnValue(of([{ id: 'card', name: 'Credit Card' }]));
    banxaServiceMock.getQuote.and.returnValue(
      of({
        fiatCode: 'USD',
        fiatAmount: 100,
        coinCode: 'QUBIC',
        coinAmount: 5000,
        price: 50,
        networkFee: 1,
        feeAmount: 2,
        paymentMethodId: 'card',
        blockchain: 'QUBIC',
        walletAddress: 'ADDR1',
      })
    );
    banxaServiceMock.createBuyOrder.and.returnValue(of({ orderId: '1', checkoutUrl: 'https://example.com/checkout' }));

    await TestBed.configureTestingModule({
      declarations: [BuyComponent],
      imports: [ReactiveFormsModule, MatSnackBarModule, NoopAnimationsModule],
      providers: [
        { provide: BanxaService, useValue: banxaServiceMock },
        { provide: WalletService, useValue: walletServiceMock },
        { provide: TranslocoService, useValue: translocoServiceMock },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(BuyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initializes with the first writable address', () => {
    expect(component.selectedAddress).toBe('ADDR1');
    expect(component.getWritableSeeds().length).toBe(1);
  });

  it('debounces quote refresh on input changes', fakeAsync(() => {
    banxaServiceMock.getQuote.calls.reset();

    component.buyForm.controls.fiatAmount.setValue(101);
    tick(300);
    component.buyForm.controls.fiatAmount.setValue(102);
    tick(300);
    component.buyForm.controls.fiatAmount.setValue(103);
    tick(499);

    expect(banxaServiceMock.getQuote).not.toHaveBeenCalled();

    tick(1);

    expect(banxaServiceMock.getQuote).toHaveBeenCalledTimes(1);
    expect(component.quote?.fiatAmount).toBe(100);
  }));

  it('loads a quote manually and then creates a checkout iframe url', () => {
    component.refreshQuote();
    expect(component.quote?.coinCode).toBe('QUBIC');

    component.createOrder();
    expect(component.banxaUrl).toBeTruthy();
  });
});
