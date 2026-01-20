import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BalanceComponent } from './balance/balance.component';
import { MainComponent } from './main/main.component';
import { SettingsComponent } from './settings/settings.component';
import { PaymentComponent } from './payment/payment.component';
import { IpoComponent } from './ipo/ipo.component';
import { PlaceBidComponent } from './ipo/place-bid/place-bid.component';
import { AssetsComponent } from './assets/assets.component';
import { TransferRightsComponent } from './assets/transfer-rights/transfer-rights.component';
import { WelcomeComponent } from './public/welcome/welcome.component';
import { CreateVaultComponent } from './public/create-vault/create-vault.component';
import { walletReadyGuard } from './guards/wallet-ready.guard';
import { PublicUnLockComponent } from './public/unlock/unlock.component';
import { ImportVaultComponent } from './public/import/import.component';
import { QearnComponent } from './qearn/qearn.component';

const routes: Routes = [
  {
    path     : 'public',
    component: WelcomeComponent
  },
  {
    path     : 'create',
    component: CreateVaultComponent
  },
  {
    path     : 'unlock',
    component: PublicUnLockComponent
  },
  {
    path     : 'import',
    component: ImportVaultComponent
  },
  {
    path     : '',
    component: MainComponent,
    canActivate: [walletReadyGuard]
  },
  {
    path     : 'payment',
    component: PaymentComponent
  },
  {
    path     : 'payment/:receiverId',
    component: PaymentComponent
  },
  {
    path     : 'payment/:receiverId/:amount',
    component: PaymentComponent
  },
  {
    path     : 'balance',
    component: BalanceComponent
  },
  {
    path     : 'qearn',
    component: QearnComponent
  },
  {
    path     : 'settings',
    component: SettingsComponent
  },
  {
    path     : 'ipo',
    component: IpoComponent
  },
  {
    path     : 'ipo/participate/:contractId',
    component: PlaceBidComponent
  },
  {
    path     : 'assets-area',
    component: AssetsComponent
  },
  {
    path     : 'assets-area/transfer-rights',
    component: TransferRightsComponent
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
