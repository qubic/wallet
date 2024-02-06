import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BalanceComponent } from './balance/balance.component';
import { MainComponent } from './main/main.component';
import { SettingsComponent } from './settings/settings.component';
import { PaymentComponent } from './payment/payment.component';
import { VotingComponent } from './voting/voting.component';
import { VotingParticipateComponent } from './voting/participate/voting-participate.component';
import { VotingCreateComponent } from './voting/create/voting-create.component';
import { IpoComponent } from './ipo/ipo.component';
import { PlaceBidComponent } from './ipo/place-bid/place-bid.component';
import { AssetsComponent } from './assets/assets.component';
import { NavigationComponent } from './navigation/navigation.component';
import { WelcomeComponent } from './public/welcome/welcome.component';
import { CreateVaultComponent } from './public/create-vault/create-vault.component';
import { walletReadyGuard } from './guards/wallet-ready.guard';
import { PublicUnLockComponent } from './public/unlock/unlock.component';
import { ImportVaultComponent } from './public/import/import.component';

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
    path     : 'voting',
    component: VotingComponent
  },
  {
    path     : 'voting/create',
    component: VotingCreateComponent
  },
  {
    path     : 'voting/create/:computorId',
    component: VotingCreateComponent
  },
  {
    path     : 'voting/participate/:index',
    component: VotingParticipateComponent
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
    path     : 'assets',
    component: AssetsComponent
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
