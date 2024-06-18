import { Injectable } from '@angular/core';
import { 
    AuthResponseArchive, BalanceResponseArchive, ContractDtoArchive, CurrentTickResponseArchive,
    MarketInformationArchive, NetworkBalanceArchive, PeerDtoArchive, ProposalCreateRequestArchive, 
    ProposalCreateResponseArchive, ProposalDtoArchive, QubicAssetArchive, SubmitTransactionRequestArchive, 
    SubmitTransactionResponseArchive, TransactionArchive 
} from './api.archive.model';
import {
  HttpClient, HttpHeaders, HttpParams,
  HttpResponse, HttpEvent, HttpParameterCodec, HttpContext
} from '@angular/common/http';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { AuthInterceptor } from './auth-interceptor';
import { environment } from '../../environments/environment';
import { map, Observable, of } from 'rxjs';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root'
})
export class ApiArchiveService {

  public currentProposals: BehaviorSubject<ProposalDtoArchive[]> = new BehaviorSubject<ProposalDtoArchive[]>([]);
  public currentIpoContracts: BehaviorSubject<ContractDtoArchive[]> = new BehaviorSubject<ContractDtoArchive[]>([]);
  public currentPeerList: BehaviorSubject<PeerDtoArchive[]> = new BehaviorSubject<PeerDtoArchive[]>([]);
  public currentProtocol: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  private basePath = environment.apiUrl;
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
    return this.httpClient.request<AuthResponseArchive>('post', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        body: authRequest,
        responseType: 'json'
      }
    );
  }

  public getCurrentBalance(publicIds: string[]) {
    let localVarPath = `/Wallet/CurrentBalance`;
    return this.httpClient.request<BalanceResponseArchive[]>('post', `${this.basePath}${localVarPath}`,
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
    return this.httpClient.request<NetworkBalanceArchive[]>('post', `${this.basePath}${localVarPath}`,
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
    return this.httpClient.request<QubicAssetArchive[]>('post', `${this.basePath}${localVarPath}`,
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
    return this.httpClient.request<MarketInformationArchive>('get', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        responseType: 'json'
      }
    );
  }

  public getCurrentIpoBids(publicIds: string[]) {
    let localVarPath = `/Wallet/CurrentIpoBids`;
    return this.httpClient.request<TransactionArchive[]>('post', `${this.basePath}${localVarPath}`,
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

  public submitTransaction(submitTransaction: SubmitTransactionRequestArchive) {
    let localVarPath = `/Public/SubmitTransaction`;
    return this.httpClient.request<SubmitTransactionResponseArchive>('post', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        headers: {
          "Content-Type": "application/json"
        },
        body: submitTransaction,
        responseType: 'json'
      })
    }

  public getCurrentTick() {
    let localVarPath = `/Public/CurrentTick`;
    return this.httpClient.request<CurrentTickResponseArchive>('get', `${this.basePath}${localVarPath}`,
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

  public getProposals() {
    let localVarPath = `/Voting/Proposal`;
    return this.httpClient.request<ProposalDtoArchive[]>('get', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        headers: {
          "Content-Type": "application/json"
        },
        responseType: 'json'
      }
    ).pipe(map((p) => {
      this.currentProposals.next(p);
      return p;
    }));
  }

  public getIpoContracts() {
    let localVarPath = `/Wallet/IpoContracts`;
    return this.httpClient.request<ContractDtoArchive[]>('get', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        headers: {
          "Content-Type": "application/json"
        },
        responseType: 'json'
      }
    ).pipe(map((p) => {
      this.currentIpoContracts.next(p);
      return p;
    }));
  }

  public submitProposalCreateRequest(proposal: ProposalCreateRequestArchive) {
    let localVarPath = `/Voting/Proposal`;
    return this.httpClient.request<ProposalCreateResponseArchive>('post', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        headers: {
          "Content-Type": "application/json"
        },
        body: proposal,
        responseType: 'json'
      }
    );
  }

  public submitProposalPublished(proposalId: string) {
    let localVarPath = `/Voting/Proposal/` + proposalId + "/publish";
    return this.httpClient.request<ProposalCreateResponseArchive>('post', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        headers: {
          "Content-Type": "application/json"
        },
        responseType: 'json'
      }
    );
  }

  public getPeerList() {
    let localVarPath = `/Public/Peers`;
    return this.httpClient.request<PeerDtoArchive[]>('get', `${this.basePath}${localVarPath}`,
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
