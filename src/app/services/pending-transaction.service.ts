import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, lastValueFrom } from 'rxjs';
import { ApiQueryService } from './apis/query/api.query.service';

const STORAGE_KEY = 'pendingTransactions';

export interface PendingTransaction {
  txId: string;
  sourceId: string;
  destId: string;
  amount: number;
  tickNumber: number;
  inputType: number;
  inputHex?: string;
  isPending: boolean;
  created: Date;
}

@Injectable({
  providedIn: 'root'
})
export class PendingTransactionService {

  public pendingTransactions$ = new BehaviorSubject<PendingTransaction[]>([]);
  private resolving = new Set<string>();

  constructor(private apiQueryService: ApiQueryService) {
    this.loadFromStorage();
  }

  addPendingTransaction(tx: PendingTransaction): void {
    const list = this.pendingTransactions$.getValue();
    if (!list.find(t => t.txId === tx.txId)) {
      this.pendingTransactions$.next([tx, ...list]);
      this.saveToStorage();
    }
  }

  clearAll(): void {
    this.pendingTransactions$.next([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  removeBySourceId(sourceId: string): void {
    const list = this.pendingTransactions$.getValue().filter(t => t.sourceId !== sourceId);
    this.pendingTransactions$.next(list);
    this.saveToStorage();
  }

  removeFailedTransaction(txId: string): void {
    const current = this.pendingTransactions$.getValue();
    const tx = current.find(t => t.txId === txId);
    if (!tx || tx.isPending) return;
    const list = current.filter(t => t.txId !== txId);
    this.pendingTransactions$.next(list);
    this.saveToStorage();
  }

  /**
   * Check pending transactions whose target tick has passed.
   * Query the query API to determine if they succeeded or failed.
   */
  async checkAndResolvePendingTransactions(lastArchivedTick: number): Promise<void> {
    const pending = [...this.pendingTransactions$.getValue()];
    if (pending.length === 0 || lastArchivedTick === 0) return;

    const toRemove: string[] = [];
    const toFail: string[] = [];

    for (const tx of pending) {
      if (!tx.isPending) continue;
      if (lastArchivedTick < tx.tickNumber) continue;
      if (this.resolving.has(tx.txId)) continue;

      this.resolving.add(tx.txId);

      try {
        await lastValueFrom(this.apiQueryService.getTransactionByHash(tx.txId));
        toRemove.push(tx.txId);
      } catch (error) {
        // Only treat 404 (not found) as a definitive failure.
        // Transient errors (500, timeout, network) leave the tx pending for retry.
        if (error instanceof HttpErrorResponse && error.status === 404) {
          toFail.push(tx.txId);
        }
      } finally {
        this.resolving.delete(tx.txId);
      }
    }

    // Apply mutations atomically against the current list
    if (toRemove.length > 0 || toFail.length > 0) {
      const removeSet = new Set(toRemove);
      const failSet = new Set(toFail);
      const list = this.pendingTransactions$.getValue()
        .filter(tx => !removeSet.has(tx.txId))
        .map(tx => failSet.has(tx.txId) ? { ...tx, isPending: false } : tx);
      this.pendingTransactions$.next(list);
      this.saveToStorage();
    }
  }

  private saveToStorage(): void {
    try {
      const data = this.pendingTransactions$.getValue();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save pending transactions:', e);
    }
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data: PendingTransaction[] = JSON.parse(raw);
        data.forEach(tx => {
          tx.created = new Date(tx.created);
        });
        this.pendingTransactions$.next(data);
      }
    } catch (e) {
      console.error('Failed to load pending transactions:', e);
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}
