import { CurrentIpoBidsContract } from '../services/apis/aggregation/api.aggregation.model';

/**
 * Union-merge getCurrentIpoBids responses per contract, new-wins by tx hash.
 * Confirmed on-chain txs are immutable, so a hash missing from a later response
 * is backend flakiness, not a removal — keeping the merged list monotone stops
 * the flaky endpoint flickering bids out. Null/undefined `transactions` (Go
 * nil-slice JSON) is treated as empty.
 */
export function mergeIpoBids(
  previous: CurrentIpoBidsContract[],
  incoming: CurrentIpoBidsContract[],
): CurrentIpoBidsContract[] {
  const byIndex = new Map<number, CurrentIpoBidsContract>();
  for (const contract of previous) {
    byIndex.set(contract.contractIndex, { ...contract, transactions: contract.transactions ?? [] });
  }
  for (const next of incoming) {
    const prev = byIndex.get(next.contractIndex);
    const merged = new Map((prev?.transactions ?? []).map(t => [t.hash, t]));
    for (const tx of next.transactions ?? []) {
      merged.set(tx.hash, tx);
    }
    byIndex.set(next.contractIndex, { ...next, transactions: [...merged.values()] });
  }
  return [...byIndex.values()];
}
