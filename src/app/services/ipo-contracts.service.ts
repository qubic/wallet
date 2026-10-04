// src/app/services/ipo-contracts.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ContractDto } from './api.model';

@Injectable({ providedIn: 'root' })
export class IpoContractsService {
  private readonly _contracts$ = new BehaviorSubject<ContractDto[]>([]);
  public readonly contracts$ = this._contracts$.asObservable();

  set(contracts: ContractDto[]): void {
    this._contracts$.next(contracts);
  }
}
