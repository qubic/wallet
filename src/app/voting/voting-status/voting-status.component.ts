import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatCheckbox, MatCheckboxChange } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { QubicHelper } from 'qubic-ts-library/dist//qubicHelper';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { ProposalDto } from 'src/app/services/api.model';

@Component({
  selector: 'app-voting-status',
  templateUrl: './voting-status.component.html',
  styleUrls: ['./voting-status.component.scss']
})
export class VotingStatusComponent implements OnInit {
  
  @Input()
  public proposal!: ProposalDto;
  
  constructor(private fb: FormBuilder, private route: ActivatedRoute, private changeDetectorRef: ChangeDetectorRef,private _snackBar: MatSnackBar,  private dialog: MatDialog)
   {
   }

  ngOnInit(): void {
   
  }

   
}
