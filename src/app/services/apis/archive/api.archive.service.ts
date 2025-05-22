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
    TransactionSendmanyResponse
} from './api.archive.model';
import { HttpClient, HttpContext } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { map, Observable, of } from 'rxjs';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';

@Injectable({
    providedIn: 'root'
})

/// https://qubic.github.io/integration/Partners/qubic-rpc-doc.html?urls.primaryName=Qubic%20RPC%20Archive%20Tree

export class ApiArchiveService {
    private basePath = environment.apiUrl;

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


    public getTransferTransactionsPerTickWithTickRange(identity: string, startTick: number, endTick: number) {
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


    public getLatestTick() {
        let localVarPath = `/v1/latestTick`;
        return this.httpClient.request<LatestTickResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: LatestTickResponse) => {
                if (response) {
                    //console.log('Response from getLatestTick:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }


    public getStatus() {
        let localVarPath = `/v1/status`;
        return this.httpClient.request<StatusResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: StatusResponse) => {
                if (response) {
                    //console.log('Response from getStatus:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }


    public getApprovedTransactions(tickNumber: number) {
        let localVarPath = `/v1/ticks/${tickNumber}/approved-transactions`;
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


    public getChainHash(tickNumber: number) {
        let localVarPath = `/v1/ticks/${tickNumber}/chain-hash`;
        return this.httpClient.request<ChainHashResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: ChainHashResponse) => {
                if (response) {
                    //console.log('Response from getChainHash:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }


    public getQuorumTickData(tickNumber: number) {
        let localVarPath = `/v1/ticks/${tickNumber}/quorum-tick-data`;
        return this.httpClient.request<QuorumTickDataResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: QuorumTickDataResponse) => {
                if (response) {
                    //console.log('Response from getQuorumTickData:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }


    public getStoreHash(tickNumber: number) {
        let localVarPath = `/v1/ticks/${tickNumber}/store-hash`;
        return this.httpClient.request<StoreHashResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: StoreHashResponse) => {
                if (response) {
                    //console.log('Response from getStoreHash:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }


    public getTickData(tickNumber: number) {
        let localVarPath = `/v1/ticks/${tickNumber}/tick-data`;
        return this.httpClient.request<TickDataResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: TickDataResponse) => {
                if (response) {
                    //console.log('Response from getTickData:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }


    public getTransactions(tickNumber: number) {
        let localVarPath = `/v1/ticks/${tickNumber}/transactions`;
        return this.httpClient.request<TransactionsResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: TransactionsResponse) => {
                if (response) {
                    //console.log('Response from getTransactions:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }


    public getTransactionsTransfer(tickNumber: number) {
        let localVarPath = `/v1/ticks/${tickNumber}/transfer-transactions`;
        return this.httpClient.request<TransactionsTransferResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: TransactionsTransferResponse) => {
                if (response) {
                    //console.log('Response from getTransactionsTransfer:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }


    public getTransaction(txId: string) {
        let localVarPath = `/v1/transactions/${txId}`;
        return this.httpClient.request<TransactionResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: TransactionResponse) => {
                if (response) {
                    //console.log('Response from getTransaction:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }


    public getTransactionStatus(txId: string) {
        let localVarPath = `/v1/tx-status/${txId}`;
        return this.httpClient.request<TransactionStatusResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: TransactionStatusResponse) => {
                if (response) {
                    //console.log('Response from getTransactionStatus:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }


    public getIdentitiesTransfers(identity: string) {
        let localVarPath = `/v2/identities/${identity}/transfers`;
        return this.httpClient.request<IdentitiesTransfersResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: IdentitiesTransfersResponse) => {
                if (response) {
                    //console.log('Response from getTransactionStatus:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }


    public getIdentitiesTransfersWithTickRange(identity: string, startTick: number, endTick: number) {
        let localVarPath = `/v2/identities/${identity}/transfers?startTick=${startTick}&endTick=${endTick}&pageSize=250`;
        return this.httpClient.request<TickHashResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: TickHashResponse) => {
                if (response) {
                    //console.log('Response from getIdentitiesTransfersWithTickRange:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }



    public getTickHashResponse(tickNumber: number) {
        let localVarPath = `/v2/ticks/${tickNumber}/hash`;
        return this.httpClient.request<TickHashResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: TickHashResponse) => {
                if (response) {
                    //console.log('Response from getTickHashResponse:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }


    public getTickQuorumData(tickNumber: number) {
        let localVarPath = `/v2/ticks/${tickNumber}/quorum-data`;
        return this.httpClient.request<TickQuorumDataResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: TickQuorumDataResponse) => {
                if (response) {
                    //console.log('Response from getTickQuorumData:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }


    public getStoreHashV2(tickNumber: number) {
        let localVarPath = `/v2/ticks/${tickNumber}/store-hash`;
        return this.httpClient.request<StoreHashV2Response>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: StoreHashV2Response) => {
                if (response) {
                    //console.log('Response from getStoreHashV2:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }


    public getTickTransactions(tickNumber: number) {
        let localVarPath = `/v2/ticks/${tickNumber}/transactions`;
        return this.httpClient.request<TickTransactionsResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: TickTransactionsResponse) => {
                if (response) {
                    //console.log('Response from getTickTransactions:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }


    public getTransactionV2(txId: string) {
        let localVarPath = `/v2/transactions/${txId}`;
        return this.httpClient.request<TransactionV2Response>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: TransactionV2Response) => {
                if (response) {
                    //console.log('Response from getTransactionV2:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }


    public getTransactionSendmany(txId: string) {
        let localVarPath = `/v2/transactions/${txId}/sendmany`;
        return this.httpClient.request<TransactionSendmanyResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: TransactionSendmanyResponse) => {
                if (response) {
                    //console.log('Response from getTransactionSendmany:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }
}