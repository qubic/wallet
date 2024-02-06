import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatCheckbox, MatCheckboxChange } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { UnLockComponent } from '../lock/unlock/unlock.component';
import { WalletService } from '../services/wallet.service';
import { QubicHelper } from 'qubic-ts-library/dist//qubicHelper';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../services/api.service';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';

@Component({
  selector: 'app-wallet',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent implements OnInit {
  
  public currentTick = 0;

  autoTick: FormControl = new FormControl(true);
  
  transferForm = this.fb.group({
    sourceId: [],
    destinationId: ["", [Validators.required, Validators.minLength(60), Validators.maxLength(60)]],
    amount: [10000, [Validators.required, Validators.min(1)]],
    tick: [0, [Validators.required]],
    autoTick: this.autoTick
  });

  constructor(private fb: FormBuilder, private route: ActivatedRoute, private changeDetectorRef: ChangeDetectorRef, private api: ApiService, private _snackBar: MatSnackBar, public walletService: WalletService, private dialog: MatDialog)
   {
    // this.tickFormControl.disable();
    this.getCurrentTick();
   }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if(params['publicId']){
        const publicId = params['publicId'];
        this.transferForm.controls.sourceId.setValue(publicId);
      }
    });
    this.route.params.subscribe(params => {
      if(params['receiverId']){
        const publicId = params['receiverId'];
        this.transferForm.controls.destinationId.setValue(publicId);
      }
      if(params['amount']){
        const amount = params['amount'];
        this.transferForm.controls.amount.setValue(amount);
      }
   });
  }

   getCurrentTick() {
    this.api.getCurrentTick().subscribe(r => {
      if(r && r.tick){
        this.currentTick = r.tick;
        this.transferForm.controls.tick.setValue(r.tick + 10);
        this.transferForm.controls.tick.addValidators(Validators.min(r.tick));
      }
    });
   }

   init() {
    this.transferForm.reset();
    this.getCurrentTick();
   }

}
