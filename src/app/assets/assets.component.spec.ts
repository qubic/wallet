import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { DecimalPipe } from '@angular/common';
import { TranslocoModule, provideTransloco } from '@ngneat/transloco';
import { BehaviorSubject, of } from 'rxjs';

import { AssetsComponent } from './assets.component';
import { ApiService } from '../services/api.service';
import { UpdaterService } from '../services/updater-service';
import { TransactionService } from '../services/transaction.service';
import { QubicStaticService } from '../services/apis/static/qubic-static.service';

describe('AssetsComponent', () => {
  let component: AssetsComponent;
  let fixture: ComponentFixture<AssetsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AssetsComponent],
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        NoopAnimationsModule,
        MatSnackBarModule,
        MatDialogModule,
        MatTableModule,
        TranslocoModule,
      ],
      providers: [
        DecimalPipe,
        { provide: ApiService, useValue: {} },
        {
          provide: UpdaterService,
          useValue: {
            internalApiBalances: new BehaviorSubject([]),
            currentTick: new BehaviorSubject(0),
            forceLoadAssets: () => {},
          },
        },
        { provide: TransactionService, useValue: {} },
        {
          provide: QubicStaticService,
          useValue: {
            getAddressName: () => of(null),
            smartContracts$: new BehaviorSubject([]),
          },
        },
        provideTransloco({
          config: {
            defaultLang: 'en',
            availableLangs: ['en'],
          },
        }),
      ],
    });
    fixture = TestBed.createComponent(AssetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
