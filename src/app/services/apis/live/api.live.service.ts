import { Injectable } from '@angular/core';

import {
    AssetsIssuedResponse,
    AssetsOwnedResponse,
    AssetsPossessedResponse,
    BalanceResponse,
    BlockHeightResponse,
    BroadcastTransactionResponse,
    QuerySmartContractRequest,
    QuerySmartContractResponse,
    TickInfoResponse,
} from './api.live.model';
import { HttpClient, HttpContext } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { map, Observable, of } from 'rxjs';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';

@Injectable({
    providedIn: 'root'
})

// https://qubic.github.io/integration/Partners/qubic-rpc-doc.html?urls.primaryName=Qubic%20RPC%20Live%20Tree

export class ApiLiveService {
    private basePath = environment.apiUrl;

    constructor(protected httpClient: HttpClient) {
    }


    public getAssetsIssued(identity: string) {
        let localVarPath = `/assets/${identity}/issued`;
        return this.httpClient.request<AssetsIssuedResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: AssetsIssuedResponse) => {
                if (response) {
                    //console.log('Response from getAssetsIssued:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }


    public getAssetsOwned(identity: string) {
        let localVarPath = `/assets/${identity}/owned`;
        return this.httpClient.request<AssetsOwnedResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: AssetsOwnedResponse) => {
                if (response) {
                    //console.log('Response from getAssetsOwned:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }


    public getAssetsPossessed(identity: string) {
        let localVarPath = `/assets/${identity}/possessed`;
        return this.httpClient.request<AssetsPossessedResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: AssetsPossessedResponse) => {
                if (response) {
                    //console.log('Response from getAssetsPossessed:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }



    public getBalance(id: string) {
        let localVarPath = `/balances/${id}`;
        return this.httpClient.request<BalanceResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: BalanceResponse) => {
                if (response) {
                    //console.log('Response from getBalance:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }


    public getBlockHeight() {
        let localVarPath = `/block-height`;
        return this.httpClient.request<BlockHeightResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: BlockHeightResponse) => {
                if (response) {
                    //console.log('Response from getBlockHeight:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }


    public submitBroadcastTransaction(encodedTransaction: string) {
        let localVarPath = `/broadcast-transaction`;
        return this.httpClient.request<BroadcastTransactionResponse>('post', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                headers: {
                    "Content-Type": "application/json"
                },
                body: encodedTransaction,
                responseType: 'json'
            }
        ).pipe(
            map((response: BroadcastTransactionResponse) => {
                if (response) {
                    //console.log('Response from submitBroadcastTransaction:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }


    public submitQuerySmartContract(querySmartContract: QuerySmartContractRequest) {
        let localVarPath = `/querySmartContract`;
        return this.httpClient.request<QuerySmartContractResponse>('post', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                headers: {
                    "Content-Type": "application/json"
                },
                body: querySmartContract,
                responseType: 'json'
            }
        ).pipe(
            map((response: QuerySmartContractResponse) => {
                if (response) {
                    //console.log('Response from submitQuerySmartContract:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }


    public getTickInfo() {
        let localVarPath = `/tick-info`;
        return this.httpClient.request<TickInfoResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: TickInfoResponse) => {
                if (response) {
                    //console.log('Response from getTickInfo:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }

}