import { Directive, NO_ERRORS_SCHEMA, Pipe, PipeTransform, SecurityContext, TemplateRef, ViewContainerRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Params } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { BuyComponent } from './buy.component';
import { WalletService } from '../services/wallet.service';

@Directive({
  selector: '[transloco]'
})
class TranslocoDirectiveStub {
  constructor(
    private templateRef: TemplateRef<unknown>,
    private viewContainer: ViewContainerRef
  ) {}

  ngOnInit(): void {
    this.viewContainer.createEmbeddedView(this.templateRef, {
      $implicit: (key: string) => key
    });
  }
}

@Pipe({
  name: 'seedDisplay'
})
class SeedDisplayPipeStub implements PipeTransform {
  transform(): string {
    return 'seed';
  }
}

@Pipe({
  name: 'seedFirstLine'
})
class SeedFirstLinePipeStub implements PipeTransform {
  transform(): string {
    return 'seed';
  }
}

@Pipe({
  name: 'seedSecondLine'
})
class SeedSecondLinePipeStub implements PipeTransform {
  transform(): string {
    return 'seed';
  }
}

describe('BuyComponent', () => {
  let component: BuyComponent;
  let fixture: ComponentFixture<BuyComponent>;
  let queryParams$: BehaviorSubject<Params>;
  let sanitizer: DomSanitizer;

  const walletServiceMock = {
    getSeeds: () => [
      { publicId: 'ADDR1', isOnlyWatch: false, alias: 'Main', balance: 1 },
      { publicId: 'WATCH1', isOnlyWatch: true, alias: 'Watch', balance: 2 },
      { publicId: 'ADDR2', isOnlyWatch: false, alias: 'Backup', balance: 3 },
    ],
  };

  beforeEach(async () => {
    queryParams$ = new BehaviorSubject<Params>({});

    await TestBed.configureTestingModule({
      declarations: [
        BuyComponent,
        TranslocoDirectiveStub,
        SeedDisplayPipeStub,
        SeedFirstLinePipeStub,
        SeedSecondLinePipeStub,
      ],
      providers: [
        { provide: WalletService, useValue: walletServiceMock },
        { provide: ActivatedRoute, useValue: { queryParams: queryParams$.asObservable() } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    sanitizer = TestBed.inject(DomSanitizer);
  });

  const createComponent = (initialParams: Params = {}) => {
    queryParams$.next(initialParams);

    fixture = TestBed.createComponent(BuyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const getSanitizedUrl = () => sanitizer.sanitize(SecurityContext.RESOURCE_URL, component.banxaUrl);

  afterEach(() => {
    queryParams$.complete();
    TestBed.resetTestingModule();
  });

  it('initializes with the first writable address', () => {
    createComponent();

    expect(component.selectedAddress).toBe('ADDR1');
    expect(component.getWritableSeeds().length).toBe(2);
    expect(getSanitizedUrl()).toContain('walletAddress=ADDR1');
  });

  it('uses a valid publicId query param when present', () => {
    createComponent({ publicId: 'ADDR2' });

    expect(component.selectedAddress).toBe('ADDR2');
    expect(getSanitizedUrl()).toContain('walletAddress=ADDR2');
  });

  it('ignores an unknown publicId query param', () => {
    createComponent({ publicId: 'UNKNOWN' });

    expect(component.selectedAddress).toBe('ADDR1');
    expect(getSanitizedUrl()).toContain('walletAddress=ADDR1');
  });

  it('ignores a watch-only publicId query param', () => {
    createComponent({ publicId: 'WATCH1' });

    expect(component.selectedAddress).toBe('ADDR1');
    expect(getSanitizedUrl()).toContain('walletAddress=ADDR1');
  });

  it('rebuilds the iframe URL when the selected address changes', () => {
    createComponent();

    component.selectedAddress = 'ADDR2';
    component.onAddressChange();

    expect(getSanitizedUrl()).toContain('coinType=QUBIC');
    expect(getSanitizedUrl()).toContain('blockchain=QUBIC');
    expect(getSanitizedUrl()).toContain('walletAddress=ADDR2');
  });

  it('renders the iframe with the expected sandbox and allow attributes', () => {
    createComponent();
    fixture.detectChanges();

    const iframe: HTMLIFrameElement | null = fixture.nativeElement.querySelector('iframe');

    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin allow-forms allow-popups allow-modals');
    expect(iframe?.getAttribute('allow')).toBe('camera; microphone; payment');
  });
});
