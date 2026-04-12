import { LayoutModule } from '@angular/cdk/layout';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslocoModule, provideTransloco } from '@ngneat/transloco';
import { BehaviorSubject } from 'rxjs';

import { NavigationComponent } from './navigation.component';
import { UpdaterService } from '../services/updater-service';
import { EnvironmentService } from '../services/env.service';

describe('NavigationComponent', () => {
  let component: NavigationComponent;
  let fixture: ComponentFixture<NavigationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [NavigationComponent],
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        NoopAnimationsModule,
        LayoutModule,
        MatButtonModule,
        MatIconModule,
        MatListModule,
        MatSidenavModule,
        MatToolbarModule,
        MatSnackBarModule,
        TranslocoModule,
      ],
      providers: [
        {
          provide: UpdaterService,
          useValue: {
            latestStats: new BehaviorSubject({}),
            currentTick: new BehaviorSubject(0),
            errorStatus: new BehaviorSubject(''),
          },
        },
        { provide: EnvironmentService, useValue: { isElectron: false } },
        provideTransloco({
          config: {
            defaultLang: 'en',
            availableLangs: ['en'],
          },
        }),
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NavigationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should compile', () => {
    expect(component).toBeTruthy();
  });
});
