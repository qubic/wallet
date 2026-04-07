import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
    GetTransactionByHashRequest,
    GetTransactionsForIdentityRequest,
    GetTransactionsForIdentityResponse,
    LastProcessedTickResponse,
    ProcessedTickInterval,
    QueryTransaction,
    QueryTransactionRecord,
} from './api.query.model';

@Injectable({
    providedIn: 'root'
})
export class ApiQueryService {
    private basePath = environment.apiUrl + '/query/v1';

    constructor(protected httpClient: HttpClient) {
    }

    public getLastProcessedTick() {
        let localVarPath = `/getLastProcessedTick`;
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

    public getTransactionByHash(hash: string) {
        let localVarPath = `/getTransactionByHash`;
        const body: GetTransactionByHashRequest = { hash };
        return this.httpClient.request<QueryTransaction>('post', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                headers: {
                    'Content-Type': 'application/json'
                },
                body,
                responseType: 'json'
            }
        ).pipe(
            map((response: QueryTransaction) => {
                if (response) {
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }

    public getProcessedTickIntervals() {
        let localVarPath = `/getProcessedTickIntervals`;
        return this.httpClient.request<ProcessedTickInterval[]>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: ProcessedTickInterval[]) => {
                if (response) {
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }

    /**
     * Fetches transactions for an identity from the query service.
     * Transforms the flat QueryTransaction[] response into the grouped
     * QueryTransactionRecord[] format that the UI expects.
     */
    public getTransfers(publicId: string, startTick: number = 0, endTick: number): Observable<QueryTransactionRecord[]> {
        const localVarPath = `/getTransactionsForIdentity`;
        const body: GetTransactionsForIdentityRequest = {
            identity: publicId,
            ranges: {
                tickNumber: {
                    gte: String(startTick),
                    lte: String(endTick),
                },
            },
            pagination: {
                offset: 0,
                size: 250,
            },
        };
        return this.httpClient.request<GetTransactionsForIdentityResponse>('post', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                headers: {
                    'Content-Type': 'application/json'
                },
                body,
                responseType: 'json'
            }
        ).pipe(
            map((response: GetTransactionsForIdentityResponse) => {
                if (response && response.transactions) {
                    return this.groupTransactions(response.transactions, publicId);
                }
                return [];
            })
        );
    }

    /**
     * Transforms flat QueryTransaction[] into grouped QueryTransactionRecord[].
     * Groups transactions by tickNumber to match the archiver's nested format.
     */
    private groupTransactions(transactions: QueryTransaction[], identity: string): QueryTransactionRecord[] {
        const grouped = new Map<number, QueryTransactionRecord>();

        for (const tx of transactions) {
            let record = grouped.get(tx.tickNumber);
            if (!record) {
                record = {
                    tickNumber: tx.tickNumber,
                    identity,
                    transactions: [],
                };
                grouped.set(tx.tickNumber, record);
            }

            record.transactions.push({
                transaction: {
                    sourceId: tx.source,
                    destId: tx.destination,
                    amount: tx.amount,
                    tickNumber: tx.tickNumber,
                    inputType: tx.inputType,
                    inputSize: tx.inputSize,
                    inputHex: this.base64ToHex(tx.inputData),
                    signatureHex: this.base64ToHex(tx.signature),
                    txId: tx.hash,
                },
                timestamp: tx.timestamp,
                moneyFlew: tx.moneyFlew,
            });
        }

        return Array.from(grouped.values());
    }

    private base64ToHex(base64: string): string {
        if (!base64) return '';
        try {
            const binary = atob(base64);
            return Array.from(binary, (char) =>
                char.charCodeAt(0).toString(16).padStart(2, '0')
            ).join('');
        } catch {
            return '';
        }
    }
}
