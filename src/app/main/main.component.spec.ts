import { DecimalPipe } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { MainComponent } from './main.component';

describe('MainComponent', () => {
  it('navigates the buy action to /buy with the selected publicId', () => {
    const router = jasmine.createSpyObj('Router', ['navigate']);
    const walletService = {
      updateConfig: jasmine.createSpy('updateConfig'),
      onConfig: new BehaviorSubject({ seeds: [] }),
      getSeeds: () => [],
      getSeed: () => undefined,
      getSettings: () => ({ useBridge: false }),
    };
    const updaterService = {
      latestStats: new BehaviorSubject({
        data: {
          price: 0,
          timestamp: '',
          circulatingSupply: '',
          activeAddresses: 0,
          marketCap: '',
          epoch: 0,
          currentTick: 0,
          ticksInCurrentEpoch: 0,
          emptyTicksInCurrentEpoch: 0,
          epochTickQuality: 0,
          burnedQus: '',
        }
      }),
      currentBalance: new BehaviorSubject([]),
      loadCurrentBalance: jasmine.createSpy('loadCurrentBalance'),
      forceLoadAssets: jasmine.createSpy('forceLoadAssets'),
    };

    const component = new MainComponent(
      walletService as any,
      { open: jasmine.createSpy('open') } as any,
      router as any,
      updaterService as any,
      {} as any,
      { open: jasmine.createSpy('open') } as any,
      { translate: (key: string) => key } as any,
      new DecimalPipe('en-US'),
      { isMobile: () => false } as any,
      { translate: (key: string) => key } as any,
    );

    component.buy('ADDR1');

    expect(router.navigate).toHaveBeenCalledWith(['/', 'buy'], {
      queryParams: {
        publicId: 'ADDR1'
      }
    });

    component.ngOnDestroy();
  });
});
