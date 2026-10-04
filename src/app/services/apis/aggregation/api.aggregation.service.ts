import { Injectable } from '@angular/core';

import {
  CurrentIpoBidsContract,
  IdentitiesAssetsResponse,
  IdentityAssetEntry,
  IdentityAssetRecord,
} from './api.aggregation.model';
import { HttpClient, HttpContext } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { map, of, Observable } from 'rxjs';
import { AGGREGATION_API_BASE_PATH } from '../../../constants/qubic.constants';
import { QubicAsset } from '../../api.model';

@Injectable({
    providedIn: 'root'
})

export class ApiAggregationService {
    private basePath = environment.apiUrl + AGGREGATION_API_BASE_PATH;

    constructor(protected httpClient: HttpClient) {
    }

    public getCurrentIpoBids(identities: string[]): Observable<CurrentIpoBidsContract[]> {
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

    public getIdentitiesAssets(publicIds: string[]): Observable<QubicAsset[]> {
        if (publicIds.length === 0) {
            return of([] as QubicAsset[]);
        }

        let localVarPath = `/getIdentitiesAssets`;
        return this.httpClient.request<IdentitiesAssetsResponse>(
            'post',
            `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                headers: { 'Content-Type': 'application/json' },
                body: { identities: publicIds },
                responseType: 'json',
            },
        ).pipe(
            map(response => this.mapToQubicAssets(response?.identityAssets ?? [])),
        );
    }

    private mapToQubicAssets(entries: IdentityAssetEntry[]): QubicAsset[] {
        const result: QubicAsset[] = [];

        for (const entry of entries) {
            // Group by (managingContractIndex, assetIssuer, assetName) — that triple
            // uniquely identifies an asset position. Owned + possessed for the same
            // position merge into a single QubicAsset.
            const byKey = new Map<string, QubicAsset>();

            const upsert = (record: IdentityAssetRecord, kind: 'owned' | 'possessed') => {
                const key = `${record.managingContractIndex}|${record.assetIssuer}|${record.assetName}`;
                let asset = byKey.get(key);
                if (!asset) {
                    asset = {
                        publicId: entry.identity,
                        contractIndex: record.managingContractIndex,
                        assetName: record.assetName,
                        contractName: '',           // UI does its own smartContractsMap lookup
                        ownedAmount: 0,
                        possessedAmount: 0,
                        tick: record.tickNumber,
                        reportingNodes: [],          // UI handles empty via ?.join(', ')
                        issuerIdentity: record.assetIssuer,
                    };
                    byKey.set(key, asset);
                }
                const amount = Number(record.numberOfShares);
                if (kind === 'owned') asset.ownedAmount = amount;
                else asset.possessedAmount = amount;
                asset.tick = Math.max(asset.tick, record.tickNumber);
            };

            for (const o of entry.ownerships ?? []) upsert(o, 'owned');
            for (const p of entry.possessions ?? []) upsert(p, 'possessed');

            result.push(...byKey.values());
        }

        return result;
    }
}
