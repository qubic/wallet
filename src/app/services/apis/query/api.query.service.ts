import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { map } from 'rxjs';
import {
    GetTransactionByHashRequest,
    GetTransactionsForTickRequest,
    GetTransactionsForIdentityRequest,
    GetTickDataRequest,
    GetComputorListsForEpochRequest,
    LastProcessedTickResponse,
    ProcessedTickIntervalsResponse,
    TransactionByHashResponse,
    TransactionsForTickResponse,
    TransactionsForIdentityResponse,
    TickDataResponse,
    ComputorListsForEpochResponse
} from './api.query.model';

@Injectable({
    providedIn: 'root'
})

// https://qubic.github.io/integration/Partners/qubic-rpc-doc.html?urls.primaryName=Qubic%20RPC%20Query%20Tree

export class ApiQueryService {
    private basePath = environment.apiUrl + "/query/v1";

    constructor(protected httpClient: HttpClient) {
    }

    /**
     * Get the last processed tick
     * GET /query/v1/getLastProcessedTick
     */
    public getLastProcessedTick() {
        const localVarPath = `/getLastProcessedTick`;
        return this.httpClient.request<LastProcessedTickResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: LastProcessedTickResponse) => {
                if (response) {
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }

    /**
     * Get processed tick intervals
     * GET /query/v1/getProcessedTickIntervals
     */
    public getProcessedTickIntervals() {
        const localVarPath = `/getProcessedTickIntervals`;
        return this.httpClient.request<ProcessedTickIntervalsResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: ProcessedTickIntervalsResponse) => {
                if (response) {
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }

    /**
     * Get transaction by hash
     * POST /query/v1/getTransactionByHash
     */
    public getTransactionByHash(hash: string) {
        const localVarPath = `/getTransactionByHash`;
        const body: GetTransactionByHashRequest = { hash };
        return this.httpClient.request<TransactionByHashResponse>('post', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                headers: {
                    "Content-Type": "application/json"
                },
                body,
                responseType: 'json'
            }
        ).pipe(
            map((response: TransactionByHashResponse) => {
                if (response) {
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }

    /**
     * Get transactions for a specific tick
     * POST /query/v1/getTransactionsForTick
     */
    public getTransactionsForTick(tickNumber: number) {
        const localVarPath = `/getTransactionsForTick`;
        const body: GetTransactionsForTickRequest = { tickNumber };
        return this.httpClient.request<TransactionsForTickResponse>('post', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                headers: {
                    "Content-Type": "application/json"
                },
                body,
                responseType: 'json'
            }
        ).pipe(
            map((response: TransactionsForTickResponse) => {
                if (response) {
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }

    /**
     * Get transactions for an identity with optional filtering and pagination
     * POST /query/v1/getTransactionsForIdentity
     */
    public getTransactionsForIdentity(request: GetTransactionsForIdentityRequest) {
        const localVarPath = `/getTransactionsForIdentity`;
        return this.httpClient.request<TransactionsForIdentityResponse>('post', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                headers: {
                    "Content-Type": "application/json"
                },
                body: request,
                responseType: 'json'
            }
        ).pipe(
            map((response: TransactionsForIdentityResponse) => {
                if (response) {
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }

    /**
     * Get tick data
     * POST /query/v1/getTickData
     */
    public getTickData(tickNumber: number) {
        const localVarPath = `/getTickData`;
        const body: GetTickDataRequest = { tickNumber };
        return this.httpClient.request<TickDataResponse>('post', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                headers: {
                    "Content-Type": "application/json"
                },
                body,
                responseType: 'json'
            }
        ).pipe(
            map((response: TickDataResponse) => {
                if (response) {
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }

    /**
     * Get computor lists for an epoch
     * POST /query/v1/getComputorListsForEpoch
     */
    public getComputorListsForEpoch(epoch: number) {
        const localVarPath = `/getComputorListsForEpoch`;
        const body: GetComputorListsForEpochRequest = { epoch };
        return this.httpClient.request<ComputorListsForEpochResponse>('post', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                headers: {
                    "Content-Type": "application/json"
                },
                body,
                responseType: 'json'
            }
        ).pipe(
            map((response: ComputorListsForEpochResponse) => {
                if (response) {
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }
}
