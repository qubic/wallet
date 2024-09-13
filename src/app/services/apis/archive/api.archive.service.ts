import { Injectable } from '@angular/core';

import { 
    ComputorsResponse,
    HealthcheckResponse,
    TransferTransactionsPerTickResponse,
    LatestTickResponse,
    StatusResponse,
    ApprovedTransactionsResponse,
    ChainHashResponse,
    QuorumTickDataResponse,
    StoreHashResponse,
    TickDataResponse,
    TransactionsResponse,
    TransactionsTransferResponse,
    TransactionResponse,
    TransactionStatusResponse,
    IdentitiesTransfersResponse,
    TickHashResponse,
    TickQuorumDataResponse,
    StoreHashV2Response,
    TickTransactionsResponse,
    TransactionV2Response,
    TransactionSendmanyResponse,
 } from './api.archive.model';
import { HttpClient, HttpContext } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { map, Observable, of } from 'rxjs';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';

@Injectable({
    providedIn: 'root'
})

https://qubic.github.io/integration/Partners/qubic-rpc-doc.html?urls.primaryName=Qubic%20RPC%20Archive%20Tree

export class ApiStatsService {
    private basePath = environment.apiArchiverUrl;

    constructor(protected httpClient: HttpClient) {
    }

    
    public getComputors(epoch: number) {
        let localVarPath = `/v1/epochs/${epoch}/computors`;
        return this.httpClient.request<ComputorsResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: ComputorsResponse) => {
                if (response) {
                    //console.log('Response from getComputors:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }


    public getHealthcheck() {
        let localVarPath = `/v1/healthcheck`;
        return this.httpClient.request<HealthcheckResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: HealthcheckResponse) => {
                if (response) {
                    //console.log('Response from getHealthcheck:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }


    public getTransferTransactionsPerTick(identity: string) {
        let localVarPath = `/v1/identities/${identity}/transfer-transactions`;
        return this.httpClient.request<TransferTransactionsPerTickResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: TransferTransactionsPerTickResponse) => {
                if (response) {
                    //console.log('Response from getTransferTransactionsPerTick:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }


    public getTransferTransactionsPerTickWithTickRange(identity: string, startTick: number, endTick : number) {
        let localVarPath = `/v1/identities/${identity}/transfer-transactions?startTick=${startTick}&endTick=${endTick}`;
        return this.httpClient.request<TransferTransactionsPerTickResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: TransferTransactionsPerTickResponse) => {
                if (response) {
                    //console.log('Response from getTransferTransactionsPerTickWithTickRange:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }



}