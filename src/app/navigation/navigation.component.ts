import { ChangeDetectorRef, Component, OnInit, ViewChild, Renderer2 } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { MediaMatcher } from '@angular/cdk/layout';
import { WalletService } from '../services/wallet.service';
import { ThemeService } from '../services/theme.service';
import { environment } from 'src/environments/environment';
import { UpdaterService } from '../services/updater-service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@ngneat/transloco';
import { MarketInformation } from '../services/api.model';
import { EnvironmentService } from '../services/env.service';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss'],
})
export class NavigationComponent implements OnInit {
  @ViewChild('snav') snav: any;

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset).pipe(
    map((result) => result.matches),
    shareReplay()
  );

  mobileQuery!: MediaQueryList;
  title = 'qubic-wallet';
  public version = ""
  public higlightTick = false;
  private currentTick = 0;

  public TickError = false;
  public currentTickSec = 0;
  private currentErrorState = '';
  private intervalId: any;

  private isMaximized = false;
  public showMinimize = false;
  public currentPrice: MarketInformation = {
    supply: 0,
    price: 0,
    capitalization: 0,
    currency: 'USD',
  };
  private _mobileQueryListener!: () => void;

  public isHomeSelected = true;
  public isSettingsSelected = false;
  public isPaymentSelected = false;
  public isBalanceSelected = false;
  public isQearnSelected = false;
  public isAssetsSelected = false;
  public isVotingSelected = false;
  public isIpoSelected = false;

  constructor(
    private renderer: Renderer2,
    private cd: ChangeDetectorRef,
    public us: UpdaterService,
    private transloco: TranslocoService,
    private _snackBar: MatSnackBar,
    public themeService: ThemeService,
    private breakpointObserver: BreakpointObserver,
    public walletService: WalletService,
    private changeDetectorRef: ChangeDetectorRef,
    private media: MediaMatcher,
    public environmentService: EnvironmentService,
    private router: Router
  ) {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const currentUrl = event.urlAfterRedirects;
        this.isHomeSelected = currentUrl === '/';
        this.isPaymentSelected = currentUrl === '/payment';
        this.isQearnSelected = currentUrl === '/qearn';
        this.isBalanceSelected = currentUrl === '/balance';
        this.isAssetsSelected = currentUrl === '/assets-area';
        this.isVotingSelected = currentUrl === '/voting';
        this.isIpoSelected = currentUrl === '/ipo';
        this.isSettingsSelected = currentUrl === '/settings';
      });
  }

  ngOnInit(): void {
    this.mobileQuery = this.media.matchMedia('(max-width: 600px)');
    this._mobileQueryListener = () => this.changeDetectorRef.detectChanges();
    this.mobileQuery.addListener(this._mobileQueryListener);
    this.version = environment.version;

    this.renderer.addClass(document.body, this.themeService.isDarkTheme ? 'darkTheme' : 'light');

    // if ((<any>window).require) {
    //   this.showMinimize = true;
    // }

    this.us.currentPrice.subscribe(
      (response) => {
        this.currentPrice = response;
      },
      (errorResponse) => {
        this._snackBar.open(errorResponse.error, this.transloco.translate('general.close'), {
          duration: 0,
          panelClass: 'error',
        });
      }
    );

    this.us.currentTick.subscribe((s) => {
      if (s && s > this.currentTick) {
        this.currentTick = s;
        this.higlightTick = true;
        this.startCounter();
        this.cd.detectChanges();
        setTimeout(() => {
          this.higlightTick = false;
        }, 1000);
      }
    });

    this.us.errorStatus.subscribe((s) => {
      if (s != '' && s != this.currentErrorState) {
        this.currentErrorState = s;
        this._snackBar.open(this.currentErrorState, this.transloco.translate('general.close'), {
          duration: 0,
          panelClass: 'error',
        });
      }
    });
  }

  startCounter(): void {
    this.stopCounter();
    this.intervalId = setInterval(() => {
      this.currentTickSec++;

      if (this.currentTickSec >= 60) {
        this.TickError = true;
      }
    }, 1000);
  }

  stopCounter(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.resetCounter();
    }
  }

  resetCounter(): void {
    this.currentTickSec = 0;
    this.TickError = false;
  }

  ngOnDestroy(): void {
    this.mobileQuery.removeListener(this._mobileQueryListener);
  }

  checkMobileToggle() {
    if (this.mobileQuery.matches) {
      this.snav.toggle();
    }
  }

  close() {
    // if (window.require) {
    //   const electron = window.require('electron');
    //   const win = (<any>electron).remote.getCurrentWindow();
    //   win.close();
    // } else {
    this.walletService.lock();
    window.close();
    // }
  }

  minimize() {
    // const electron = window.require('electron');
    // const win = (<any>electron).remote.getCurrentWindow();
    //win.minimize();
  }

  maximize() {
    this.isMaximized = !this.isMaximized;
    // if ((<any>window).require) {
    //   const { remote } = window.require('electron-remote');
    //   // Retrieve focused window
    //   const win = remote.getCurrentWindow();
    //   this.isMaximized ? win.unmaximize() : win.maximize();
    // } else {
    this.isMaximized ? this.openFullscreen() : this.closeFullscreen();
    // }
  }

  /* View in fullscreen */
  private openFullscreen() {
    var elem = document.documentElement;
    if (this.isMaximized) {
      elem.requestFullscreen();
    } else if ((<any>elem).webkitRequestFullscreen) {
      /* Safari */
      (<any>elem).webkitRequestFullscreen();
    } else if ((<any>elem).msRequestFullscreen) {
      /* IE11 */
      (<any>elem).msRequestFullscreen();
    }
  }

  /* Close fullscreen */
  private closeFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((<any>document).webkitExitFullscreen) {
      /* Safari */
      (<any>document).webkitExitFullscreen();
    } else if ((<any>document).msExitFullscreen) {
      /* IE11 */
      (<any>document).msExitFullscreen();
    }
  }

  openPrivacyPolicy() {
    window.open('https://qubic.org/Privacy-policy', '_blank');
  }
}
