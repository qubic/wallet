import { ChangeDetectorRef, Component } from '@angular/core';
import { MediaMatcher } from '@angular/cdk/layout';
import { ApiService } from './services/api.service';
import { ApiLiveService } from './services/apis/live/api.live.service';
import { ApiStatsService } from './services/apis/stats/api.stats.service';
import { ApiTxStatusService } from './services/apis/txstatus/api.txstatus.service';
import { DeviceDetectorService, DeviceInfo } from 'ngx-device-detector';
import { ThemeService } from './services/theme.service';
import { QubicService } from './services/qubic.service';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  mobileQuery!: MediaQueryList;
  title = 'qubic-wallet';

  private deviceInfo!: DeviceInfo;
  public isMobile = false;
  public isDesktop = false;
  private bridgeConnected = false;
  private _mobileQueryListener!: () => void;
  public isElectron = false;

  constructor(
    public themeService: ThemeService,
    private changeDetectorRef: ChangeDetectorRef,
    private media: MediaMatcher,
    api: ApiService,
    private deviceService: DeviceDetectorService,
    private q: QubicService,

    private matIconRegistry: MatIconRegistry,
    private sanitizer: DomSanitizer
  ) {
    this.checkSize();
    this.init();

    if ((<any>window).require) {
      this.isElectron = true;
    }

    this.matIconRegistry.addSvgIcon(
      'key_vertical',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/img/key-vertical.svg')
    );
  }

  init() {
    addEventListener(
      "resize"
      , () => {
        this.checkSize();
      }
    );
  }

  checkSize() {
    this.mobileQuery = this.media.matchMedia('(max-width: 600px)');
    this._mobileQueryListener = () => this.changeDetectorRef.detectChanges();
    this.mobileQuery.addListener(this._mobileQueryListener);
    this.deviceInfo = this.deviceService.getDeviceInfo();
    this.isMobile = this.deviceService.isMobile();
    this.isDesktop = this.deviceService.isDesktop();


  }

  ngOnDestroy(): void {
    this.mobileQuery.removeListener(this._mobileQueryListener);
  }
}
