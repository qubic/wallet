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
import { lastValueFrom, map, Observable, of } from 'rxjs';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { WalletService } from '../../wallet.service';
import Crypto, { PUBLIC_KEY_LENGTH, DIGEST_LENGTH, SIGNATURE_LENGTH } from 'qubic-ts-library/dist/crypto'
import { QubicHelper } from 'qubic-ts-library/dist/qubicHelper';
import { QubicTransaction } from 'qubic-ts-library/dist/qubic-types/QubicTransaction';
import { QubicPackageBuilder } from 'qubic-ts-library/dist/QubicPackageBuilder';
import { DynamicPayload } from 'qubic-ts-library/dist/qubic-types/DynamicPayload';
import { QubicDefinitions } from 'qubic-ts-library/dist/QubicDefinitions';

const qHelper = new QubicHelper();

@Injectable({
    providedIn: 'root'
})

// https://qubic.github.io/integration/Partners/qubic-rpc-doc.html?urls.primaryName=Qubic%20RPC%20Live%20Tree

export class ApiLiveService {
    private basePath = environment.apiUrl;

    constructor(protected httpClient: HttpClient, private walletService: WalletService) {
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
        let localVarPath = `/v1/broadcast-transaction`;
        return this.httpClient.request<BroadcastTransactionResponse>('post', `${this.basePath}${localVarPath}`,
            {
                context: new HttpContext(),
                headers: {
                    "Content-Type": "application/json"
                },
                body: { encodedTransaction },
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
        let localVarPath = `/v1/querySmartContract`;
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
                    // console.log('Response from submitQuerySmartContract:', response);
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

    public async submitQearnTransaction(seed: string, contractIndex:number, inputType: number, inputSize: number, amount: number, payload: any, tick: number) {
        try {
          const idPackage = await qHelper.createIdPackage(seed);

          const destinationPublicKey = new Uint8Array(QubicDefinitions.PUBLIC_KEY_LENGTH);
          destinationPublicKey.fill(0);
          destinationPublicKey[0] = contractIndex;

          const dynamicPayload = new DynamicPayload(inputSize);
          if (payload.UnlockAmount && payload.LockedEpoch) {
            const combinedPayload = new Uint8Array(12);
            const view = new DataView(combinedPayload.buffer);
            
            view.setBigUint64(0, BigInt(payload.UnlockAmount), true);
            view.setUint32(8, payload.LockedEpoch, true);
            
            dynamicPayload.setPayload(combinedPayload);
          }

          const tx = new QubicTransaction().setSourcePublicKey(idPackage.publicId)
          .setDestinationPublicKey(await qHelper.getIdentity(destinationPublicKey))
          .setAmount(amount)
          .setTick(tick + this.walletService.getSettings().tickAddition)
          .setInputType(inputType)
          .setInputSize(inputSize)
          if(dynamicPayload.getPackageSize() > 0) {
              tx.setPayload(dynamicPayload);
            }
            const res = await tx.build(seed);
            const txResult = await lastValueFrom(this.submitBroadcastTransaction(this.walletService.arrayBufferToBase64(res)));
            return {
                txResult,
          };
        } catch (error) {
          console.error("Error signing transaction:", error);
          throw new Error("Failed to sign and broadcast transaction.");
        }
    }
}