import { Injectable } from '@angular/core';

import { LatestStatsResponse } from './api.stats.model';
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

    constructor(protected httpClient: HttpClient,) {

    }

    public getLatestStats() {
        let localVarPath = `/v1/latest-stats`;
        return this.httpClient.request<LatestStatsResponse>('get', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                responseType: 'json'
            }
        ).pipe(
            map((response: LatestStatsResponse) => {
                if (response) {
                    //console.log('Response from getStatus:', response);
                    return response;
                } else {
                    throw new Error('Invalid response format');
                }
            })
        );
    }
}