import { Injectable } from '@angular/core';
import { createLiveClient } from '@qubic.org/rpc';
import { qUtilGetBalances16 } from '@qubic.org/contracts';
import { identityToPublicKey } from '@qubic.org/crypto';
import { environment } from '../../environments/environment';
import { LIVE_API_BASE_PATH } from '../constants/qubic.constants';
const BATCH_SIZE = 16;
const idToPk = identityToPublicKey as (id: string) => Uint8Array;

@Injectable({ providedIn: 'root' })
export class QubicRpcService {
  private live = createLiveClient({ baseUrl: environment.apiUrl + LIVE_API_BASE_PATH });

  async getBalances(ids: string[]): Promise<Map<string, bigint>> {
    if (!ids.length) return new Map();

    const batches: string[][] = [];
    for (let i = 0; i < ids.length; i += BATCH_SIZE) batches.push(ids.slice(i, i + BATCH_SIZE));

    const result = new Map<string, bigint>();
    await Promise.all(
      batches.map(async (batch) => {
        const r = await qUtilGetBalances16(
          this.live,
          { publicKeys: batch },
          { identityToPublicKey: idToPk },
        );
        if (!r.ok) throw r.error;
        batch.forEach((id, i) => result.set(id, r.value.balances[i] ?? 0n));
      }),
    );
    return result;
  }
}
