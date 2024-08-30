import { Injectable } from '@angular/core';
import { tap } from 'rxjs/operators';
import { BalanceResponse } from './api.model';


import {
  LatestTickResponseArchiver,
  AuthResponseArchiver, StatusArchiver, BalanceResponseArchiver, ContractDtoArchiver,
  MarketInformationArchiver, TranscationsArchiver, PeerDtoArchiver, ProposalCreateRequestArchiver,
  ProposalCreateResponseArchiver, ProposalDtoArchiver, QubicAssetArchiver, SubmitTransactionRequestArchiver,
  SubmitTransactionResponseArchiver, TransactionArchiver, CurrentBalanceHttpResponse
} from './api.archiver.model';
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
export class ApiArchiverService {

  public currentProposals: BehaviorSubject<ProposalDtoArchiver[]> = new BehaviorSubject<ProposalDtoArchiver[]>([]);
  public currentIpoContracts: BehaviorSubject<ContractDtoArchiver[]> = new BehaviorSubject<ContractDtoArchiver[]>([]);
  public currentPeerList: BehaviorSubject<PeerDtoArchiver[]> = new BehaviorSubject<PeerDtoArchiver[]>([]);
  public currentProtocol: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  private basePath = environment.apiArchiverUrl;
  private authenticationActive = false;

  constructor(protected httpClient: HttpClient, private tokenSerice: TokenService, private authInterceptor: AuthInterceptor) {

  }


  public getStatus() {
    let localVarPath = `/v1/status`;
    return this.httpClient.request<StatusArchiver>('get', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        responseType: 'json'
      }
    ).pipe(
      map((response: StatusArchiver) => {
        if (response) {          
          //console.log('Response from getStatus:', response);
          return response;
        } else {
          throw new Error('Invalid response format');
        }
      })
    );
  }

  public getCurrentTick(): Observable<number> {
    let localVarPath = `/v1/latestTick`;
    return this.httpClient.request<LatestTickResponseArchiver>('get', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        responseType: 'json'
      }
    ).pipe(
      map((response: LatestTickResponseArchiver) => {
        if (response && typeof response.latestTick === 'number') {
          // console.log('Response from getCurrentTick:', response);
          return response.latestTick;
        } else {
          throw new Error('Invalid response format');
        }
      })
    );
  }



  public getTransactions(publicId: string, startTick: number = 0, lastTick: number): Observable<TranscationsArchiver[]>  {
    const localVarPath = `/v2/identities/${publicId}/transfers?startTick=${startTick}&endTick=${lastTick}`;
    return this.httpClient.request<TranscationsArchiver[]>('get', `${this.basePath}${localVarPath}`, {
      context: new HttpContext(),
      responseType: 'json'
    }).pipe(
      tap(response => {
       //console.log('Response from getTransactions:', response);
      })
    );
  }



  public getCurrentBalanceFromHttpService(identity: string): Observable<BalanceResponse> {
    const localVarPath = `/v1/balances/${identity}`;
    return this.httpClient.get<CurrentBalanceHttpResponse>(`${this.basePath}${localVarPath}`).pipe(
      map(response => this.mapToBalanceResponse(response))
    );
  }

  private mapToBalanceResponse(response: CurrentBalanceHttpResponse): BalanceResponse {
    return {
      publicId: response.id,
      currentEstimatedAmount: parseFloat(response.balance),
      isComputor: false,  // Annahme: Standardwert, da nicht vorhanden
      epochBaseAmount: 0, // Standardwert, da nicht vorhanden
      epochChanges: 0,    // Standardwert, da nicht vorhanden
      baseDate: new Date(), // Du kannst hier eine andere Logik für das Datum verwenden
      transactions: []    // Leeres Array, da Transaktionen nicht im neuen Endpunkt vorhanden sind
    };
  }
  


  //Todo 
  //old endpoints from qli-Api


  public getCurrentBalance(publicIds: string[]) {
    let localVarPath = `/Wallet/CurrentBalance`;
    return this.httpClient.request<BalanceResponseArchiver[]>('post', `${this.basePath}${localVarPath}`,
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
    return this.httpClient.request<QubicAssetArchiver[]>('post', `${this.basePath}${localVarPath}`,
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
    return this.httpClient.request<MarketInformationArchiver>('get', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        responseType: 'json'
      }
    );
  }

  public getCurrentIpoBids(publicIds: string[]) {
    let localVarPath = `/Wallet/CurrentIpoBids`;
    return this.httpClient.request<TransactionArchiver[]>('post', `${this.basePath}${localVarPath}`,
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

  public submitTransaction(submitTransaction: SubmitTransactionRequestArchiver) {
    let localVarPath = `/Public/SubmitTransaction`;
    return this.httpClient.request<SubmitTransactionResponseArchiver>('post', `${this.basePath}${localVarPath}`,
      {
        context: new HttpContext(),
        headers: {
          "Content-Type": "application/json"
        },
        body: submitTransaction,
        responseType: 'json'
      })
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
    return this.httpClient.request<ProposalDtoArchiver[]>('get', `${this.basePath}${localVarPath}`,
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
    return this.httpClient.request<ContractDtoArchiver[]>('get', `${this.basePath}${localVarPath}`,
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

  public submitProposalCreateRequest(proposal: ProposalCreateRequestArchiver) {
    let localVarPath = `/Voting/Proposal`;
    return this.httpClient.request<ProposalCreateResponseArchiver>('post', `${this.basePath}${localVarPath}`,
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
    return this.httpClient.request<ProposalCreateResponseArchiver>('post', `${this.basePath}${localVarPath}`,
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
    return this.httpClient.request<PeerDtoArchiver[]>('get', `${this.basePath}${localVarPath}`,
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
