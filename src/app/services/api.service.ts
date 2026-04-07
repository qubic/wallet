import { Injectable } from '@angular/core';
import { AuthResponse, BalanceResponse, ContractDto, CurrentTickResponse, MarketInformation, NetworkBalance, PeerDto, QubicAsset } from './api.model';
import { HttpClient, HttpContext } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { AuthInterceptor } from './auth-interceptor';
import { environment } from '../../environments/environment';
import { map } from 'rxjs';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private _currentIpoContracts = new BehaviorSubject<ContractDto[]>([]);
  public currentIpoContracts = this._currentIpoContracts.asObservable();

  public setIpoContracts(contracts: ContractDto[]): void {
    this._currentIpoContracts.next(contracts);
  }
  public currentPeerList: BehaviorSubject<PeerDto[]> = new BehaviorSubject<PeerDto[]>([]);
  public currentProtocol: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  private basePath = environment.apiQliUrl;
  private authenticationActive = false;

  constructor(protected httpClient: HttpClient, private tokenSerice: TokenService, private authInterceptor: AuthInterceptor) {
    this.reAuthenticate();
  }

  public reAuthenticate() {
    if (this.authenticationActive)
      return;

    this.authenticationActive = true;
    // temp login for current use with public user
    // login to qubic.li
    this.login({
      username: 'guest@qubic.li',
      password: 'guest13@Qubic.li'
    }).subscribe(r => {
      if (r && r.token) {
        this.onAuthenticated(r.token);
      }
      this.authenticationActive = false;
    }, (e) => {
      this.authenticationActive = false;
    });
  }

  private onAuthenticated(token: string) {
    this.setToken(token);
    this.getProtocol().subscribe();
    this.getPeerList().subscribe();
  }

  private setToken(token: string) {
    this.tokenSerice.nextToken(token);
  }

  public login(authRequest: { username: string, password: string }) {
    let localVarPath = `/Auth/Login`;
    return this.httpClient.request<AuthResponse>('post', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        body: authRequest,
        responseType: 'json'
      }
    );
  }

  public getCurrentBalance(publicIds: string[]) {
    let localVarPath = `/Wallet/CurrentBalance`;
    return this.httpClient.request<BalanceResponse[]>('post', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        headers: {
          "Content-Type": "application/json"
        },
        body: publicIds,
        responseType: 'json'
      }
    );
  }

  public getNetworkBalances(publicIds: string[]) {
    let localVarPath = `/Wallet/NetworkBalances`;
    return this.httpClient.request<NetworkBalance[]>('post', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        headers: {
          "Content-Type": "application/json"
        },
        body: publicIds,
        responseType: 'json'
      }
    );
  }

  public getOwnedAssets(publicIds: string[]) {
    let localVarPath = `/Wallet/Assets`;
    return this.httpClient.request<QubicAsset[]>('post', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        headers: {
          "Content-Type": "application/json"
        },
        body: publicIds,
        responseType: 'json'
      }
    );
  }

  public getCurrentPrice() {
    let localVarPath = `/Public/MarketInformation`;
    return this.httpClient.request<MarketInformation>('get', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        responseType: 'json'
      }
    );
  }

  public getCurrentTick() {
    let localVarPath = `/Public/CurrentTick`;
    return this.httpClient.request<CurrentTickResponse>('get', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        responseType: 'json'
      }
    );
  }


  public getProtocol() {
    let localVarPath = `/Public/Protocol`;
    return this.httpClient.request<number>('get', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        headers: {
          "Content-Type": "application/json"
        },
        responseType: 'json'
      }
    ).pipe(map((p) => {
      this.currentProtocol.next(p);
      return p;
    }));
  }

  public getPeerList() {
    let localVarPath = `/Public/Peers`;
    return this.httpClient.request<PeerDto[]>('get', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        headers: {
          "Content-Type": "application/json"
        },
        responseType: 'json'
      }
    ).pipe(map((p) => {
      this.currentPeerList.next(p);
      return p;
    }));
  }

}
