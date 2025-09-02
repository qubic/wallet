import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { WalletService } from '../../services/wallet.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { ApiLiveService } from 'src/app/services/apis/live/api.live.service';

@Component({
  selector: 'qli-welcome',
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

  constructor(public themeService: ThemeService, private fb: FormBuilder, private route: ActivatedRoute, private changeDetectorRef: ChangeDetectorRef, private apiLiveService: ApiLiveService, private _snackBar: MatSnackBar, public walletService: WalletService, private dialog: MatDialog) {
    // this.tickFormControl.disable();
    this.getCurrentTick();
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['publicId']) {
        const publicId = params['publicId'];
        this.transferForm.controls.sourceId.setValue(publicId);
      }
    });
    this.route.params.subscribe(params => {
      if (params['receiverId']) {
        const publicId = params['receiverId'];
        this.transferForm.controls.destinationId.setValue(publicId);
      }
      if (params['amount']) {
        const amount = params['amount'];
        this.transferForm.controls.amount.setValue(amount);
      }
    });
  }

  getCurrentTick() {
    this.apiLiveService.getTickInfo().subscribe(r => {
      if (r && r.tickInfo) {
        this.currentTick = r.tickInfo.tick;
        this.transferForm.controls.tick.setValue(this.currentTick + 10);
        this.transferForm.controls.tick.addValidators(Validators.min(this.currentTick));
      }
    });
  }

  init() {
    this.transferForm.reset();
    this.getCurrentTick();
  }

}
