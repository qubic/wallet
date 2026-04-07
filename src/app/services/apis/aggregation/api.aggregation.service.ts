import { Injectable } from '@angular/core';

import { CurrentIpoBidsContract } from './api.aggregation.model';
import { HttpClient, HttpContext } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { map, of } from 'rxjs';

@Injectable({
    providedIn: 'root'
})

export class ApiAggregationService {
    private basePath = environment.aggregationApiUrl + "/aggregation/v1";

    constructor(protected httpClient: HttpClient) {
    }

    public getCurrentIpoBids(identities: string[]) {
        if (identities.length === 0) {
            return of([] as CurrentIpoBidsContract[]);
        }

        let localVarPath = `/getCurrentIpoBids`;
        return this.httpClient.request<CurrentIpoBidsContract[]>('post', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                headers: {
                    "Content-Type": "application/json"
                },
                body: { identities },
                responseType: 'json'
            }
        ).pipe(
            map((response: CurrentIpoBidsContract[]) => {
                return response || [];
            })
        );
    }
}
