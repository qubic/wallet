import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
    GetTransactionByHashRequest,
    LastProcessedTickResponse,
    QueryTransaction,
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
}
