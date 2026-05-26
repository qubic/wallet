import { Injectable } from '@angular/core';
import { AuthResponse, ContractDto, QubicAsset } from './api.model';
import { HttpClient, HttpContext } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { AuthInterceptor } from './auth-interceptor';
import { environment } from '../../environments/environment';
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
        this.tokenSerice.nextToken(r.token);
      }
      this.authenticationActive = false;
    }, (e) => {
      this.authenticationActive = false;
    });
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

}
