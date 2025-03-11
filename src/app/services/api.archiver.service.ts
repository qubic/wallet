import { Injectable } from '@angular/core';
import { tap } from 'rxjs/operators';


import {
  LatestTickResponseArchiver, StatusArchiver, TransactionsArchiver
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
  public currentProtocol: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  private basePath = environment.apiUrl;

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


  public getTransactions(publicId: string, startTick: number = 0, lastTick: number, pageNumber: number = 1): Observable<TransactionsArchiver[] >  {
    const localVarPath = `/v2/identities/${publicId}/transfers?startTick=${startTick}&endTick=${lastTick}&page=${pageNumber}&desc=true`;
    // alert(localVarPath);
    // console.log('localVarPath: ', localVarPath);
    return this.httpClient.request<TransactionsArchiver[]>('get', `${this.basePath}${localVarPath}`, {
      context: new HttpContext(),
      responseType: 'json'
    }).pipe(
      tap(response => {
       //console.log('Response from getTransactions:', response);
      })
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
}
