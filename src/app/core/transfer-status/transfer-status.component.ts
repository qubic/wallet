import { Component, Input } from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import { TranslocoService } from '@ngneat/transloco';
import { Transaction } from 'src/app/services/api.model';


@Component({
  selector: 'qli-transfer-status',
  templateUrl: './transfer-status.component.html',
  styleUrls: ['./transfer-status.component.scss']
})
export class TransferStatusComponent {

  @Input()
  transaction!: Transaction;

  constructor(public translocoService: TranslocoService, public dialog: MatDialog){
  }

 
}
