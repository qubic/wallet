import { Injectable } from '@angular/core';

import { ApprovedTransactionsResponse, TxStatusStatusResponse, TxStatusResponse } from './api.txstatus.model';
import { HttpClient, HttpContext } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { map, Observable, of } from 'rxjs';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';

@Injectable({
    providedIn: 'root'
})

export class ApiStatsService {
    public currentProtocol: BehaviorSubject<number> = new BehaviorSubject<number>(0);
    private basePath = environment.apiArchiverUrl;

    constructor(protected httpClient: HttpClient) {
    }


    public getApprovedTransactions(tickNumber: number): Observable<ApprovedTransactionsResponse> {
        let localVarPath = `/ticks/{tickNumber}/approved-transactions`;
        return this.httpClient.request<ApprovedTransactionsResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: ApprovedTransactionsResponse) => {
                if (response) {
                    //console.log('Response from getApprovedTransactions:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }


    public getStatus() {
        let localVarPath = `/tx-status/status`;
        return this.httpClient.request<TxStatusStatusResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: TxStatusStatusResponse) => {
                if (response) {
                    //console.log('Response from getStatus:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }


    public getTxStatus() {
        let localVarPath = `/tx-status/{txId}`;
        return this.httpClient.request<TxStatusResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: TxStatusResponse) => {
                if (response) {
                    //console.log('Response from getTxStatus:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }
}