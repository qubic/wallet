import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { WalletService } from '../../services/wallet.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@ngneat/transloco';
import { BalanceResponse, ProposalCreateResponse, ProposalDto, Transaction } from '../../services/api.model';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { UpdaterService } from '../../services/updater-service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { UnLockComponent } from 'src/app/lock/unlock/unlock.component';
import { MatDialog } from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';
import { QubicHelper } from 'qubic-ts-library/dist//qubicHelper';

@Component({
  selector: 'app-voting-create',
  templateUrl: './voting-create.component.html',
  styleUrls: ['./voting-create.component.scss']
})
export class VotingCreateComponent implements OnInit, OnDestroy {

  @ViewChild('stepper')
  public stepper!: MatStepper;

  public accountBalances: BalanceResponse[] = [];
  public seedFilterFormControl: FormControl = new FormControl();
  public currentTick = 0;
  public userServiceSubscription: Subscription | undefined;
  public proposals: ProposalDto[] | undefined;
  public proposal: ProposalDto | undefined;
  private sub: any;
  private triedToload = false;
  public proposalToPublish: ProposalCreateResponse | undefined;
  private selectedComputorId: string | null = null;
  public isPublished = false;
  private ws = new WebSocket('wss://webbridge.qubic.li/');
  private isWsConnected = false;
  private dataPackageToSend: string | null = null;
  public isPublishing = false;
  public isPublishedFormControl = new FormControl('')


  public proposalForm = this.fb.group({
    computorId: ['', [Validators.required]],
    title: ["", [Validators.required,Validators.minLength(2), Validators.maxLength(100)]],
    description: ["", [Validators.required,Validators.minLength(2)]],
    option1: ["", [Validators.required,Validators.minLength(2), Validators.maxLength(50)]],
    option2: ["", [Validators.required,Validators.minLength(2), Validators.maxLength(50)]],
    option3: ["",[Validators.minLength(2),Validators.maxLength(50)]],
    option4: ["",[Validators.minLength(2),Validators.maxLength(50)]],
    option5: ["",[Validators.minLength(2),Validators.maxLength(50)]],
    option6: ["",[Validators.minLength(2),Validators.maxLength(50)]],
    option7: ["",[Validators.minLength(2),Validators.maxLength(50)]]
  });

  public publishForm = this.fb.group({
    operatorId: [localStorage.getItem("lastOperatorId"), [Validators.required]],
    computorIp: [localStorage.getItem("lastComputorIp"), [Validators.required]]
  });

  constructor(private router: Router, private transloco: TranslocoService, private api: ApiService, public walletService: WalletService, private _snackBar: MatSnackBar, private us: UpdaterService
    , private route: ActivatedRoute
    , private fb: FormBuilder
    , private dialog: MatDialog
  ) {
    this.api.currentProposals.subscribe(s => {
      if (s.length == 0 && !this.triedToload) {
        this.triedToload = true;
        this.api.getProposals().subscribe();
      } else {
        this.proposals = s;
        this.init();
      }
    });
    this.isPublishedFormControl.setErrors({ "required": true}); // fake state for last step
  }
  ngOnDestroy(): void {
    if (this.userServiceSubscription)
      this.userServiceSubscription.unsubscribe();
    if (this.sub)
      this.sub.unsubscribe();
    if (this.ws) {
      this.ws.close();
    }
  }

  ngOnInit(): void {
    if (this.hasSeeds()) {
      this.userServiceSubscription = this.us.currentBalance.subscribe(response => {
        this.accountBalances = response;
      }, errorResponse => {
        this._snackBar.open(errorResponse.error, this.transloco.translate("general.close"), {
          duration: 0,
          panelClass: "error"
        });
      });
    }

    this.proposalForm.controls.computorId.valueChanges.subscribe(s => {
      if (!this.selectedComputorId)
        this.router.navigate(['/voting/create/', s])
    });

    this.initializeBridge();
  }

  toBase64(u8: any): string {
    return btoa(String.fromCharCode.apply(null, u8));
  }

  connectPeer(ipAddress: string): void {
    this.ws.send(JSON.stringify(
      {
        command: 'connect',
        host: ipAddress,
        port: 21841
      }
    ));
  }



  onPeerConnect() {
    // here we are connected to the qubic peer
    if (this.dataPackageToSend != null) {
      // send package to peer
      this.ws.send(JSON.stringify(
        {
          command: 'sendb',
          data: this.dataPackageToSend
        }
      ));
      this.dataPackageToSend = null; // set to null to avoid multiple sends
    }
  }

  initializeBridge(): void {
    this.ws.onmessage = (event: any): void => {
      const jsonData = JSON.parse(event.data);
      if (jsonData.message === 'connect done') {
        this.onPeerConnect();
      } else if (jsonData.message === 'recv data') {
        const byteArray = Uint8Array.from(atob(jsonData.data), c => c.charCodeAt(0));
        if (byteArray[3] === 4) {
          // save proposal
          if (this.proposalToPublish) {
            this.api.submitProposalPublished(this.proposalToPublish.id).subscribe(s => {
              this.isPublished = true;
              this.isPublishedFormControl.reset();
              this.stepper.next();
            });
          }
        }
      }
    };
    this.ws.onopen = (): void => {
      this.isWsConnected = true;
    };
    this.ws.onclose = (): void => {
      this.isWsConnected = false;
    };
  }

  init(): void {
    this.sub = this.route.params.subscribe((params) => {
      if (params['computorId']) {
        this.selectedComputorId = params['computorId'];
        this.proposal = this.proposals?.find(f => f.computorId == this.selectedComputorId);
        this.proposalForm.controls.computorId.setValue(this.selectedComputorId);
        if (this.proposal) {
          this.proposalForm.controls.title.setValue((<any>this.proposal.title));
          this.proposalForm.controls.description.setValue((<any>this.proposal.description));
          const lines = this.proposal.options?.split("\n");
          let i = 1;
          lines?.forEach(line => {
            (<any>this.proposalForm.controls)["option" + i].setValue(line);
            i++;
          });
        }
      }
    });
  }

  getDate() {
    return new Date();
  }

  getTotalBalance(estimaed = false): number {
    if (estimaed)
      return this.accountBalances.reduce((p, c) => p + (c.currentEstimatedAmount), 0);
    else
      return this.accountBalances.reduce((p, c) => p + (c.epochBaseAmount), 0);
  }

  hasSeeds() {
    return this.walletService.getSeeds().length > 0;
  }

  onlyUnique(value: Transaction, index: any, array: Transaction[]) {
    return array.findIndex((f: Transaction) => f.id === value.id) == index;
  }

  getTransactions(publicId: string | null = null): Transaction[] {
    return this.accountBalances.flatMap((b) => b.transactions.filter(f => publicId == null || f.sourceId == publicId || f.destId == publicId))
      .filter(this.onlyUnique)
      .sort((a, b) => { return (<any>new Date(b.created)) - (<any>new Date(a.created)) });
  }

  isOwnId(publicId: string): boolean {
    return this.walletService.getSeeds().find(f => f.publicId == publicId) !== undefined;
  }

  getSeedName(publicId: string): string {
    var seed = this.walletService.getSeeds().find(f => f.publicId == publicId);
    if (seed !== undefined)
      return '(' + seed.alias + ')';
    else
      return '';
  }

  getComputors() {
    return this.walletService.getSeeds().filter(f =>
      this.accountBalances.find(q => q.isComputor && f.publicId == q.publicId)
      &&
      !this.proposals?.find(q => q.computorId == f.publicId && q.isPublished)
    );
  }
  getSeeds() {
    return this.walletService.getSeeds();
  }

  repeat(transaction: Transaction) {
    this.router.navigate(['payment'], {
      state: {
        template: transaction
      }
    });
  }

  hasComputors() {
    return this.accountBalances.find(f => f.isComputor);
  }

  submitPublishForm() {
    if (!this.publishForm.valid) {
      this._snackBar.open("Invalid Form State", "close", {
        duration: 5000,
        panelClass: "error"
      });
      return;
    }
    if (!this.walletService.privateKey) {
      this._snackBar.open("Please unlock your Wallet first", "close", {
        duration: 5000,
        panelClass: "error"
      });
      return;
    }
    if (!this.proposalToPublish?.url || this.proposalToPublish?.url.length! <= 0 || !this.proposalToPublish?.computorIndex) {
      this._snackBar.open("Validateion Errors. Please Try Again Later", "close", {
        duration: 5000,
        panelClass: "error"
      });
      return;
    }
    if (!this.isWsConnected) {
      this._snackBar.open("Socked Connection Closed. Please Try Again Later", "close", {
        duration: 5000,
        panelClass: "error"
      });
      return;
    }

    // save ip and operator
    localStorage.setItem("lastComputorIp", this.publishForm.controls.computorIp.value!);
    localStorage.setItem("lastOperatorId", this.publishForm.controls.operatorId.value!);

    this.isPublishing = true;
    // create package
    this.walletService.revealSeed((<any>this.publishForm.controls.operatorId.value)).then(operatorSeed => {

      new QubicHelper().createProposal(this.proposalToPublish?.currentProtocol!, this.proposalToPublish?.computorIndex!, operatorSeed, this.proposalToPublish?.url!).then(proposal => {
        this.dataPackageToSend = this.toBase64(proposal);
        // connect
        this.connectPeer(this.publishForm.controls.computorIp.value!);
        window.setTimeout(() => {
          if (!this.isPublished) {
            this.isPublishing = false;
            this._snackBar.open("It Seems Liks There Was A Publishing Error. Please Try Again.", "close", {
              duration: 10000,
              panelClass: "error"
            });
          }
        }, 5000);
      });
    }).catch(e => {
      this._snackBar.open("We were not able to decrypt your seed. Did you use the correct private key??", "close", {
        duration: 10000,
        panelClass: "error"
      });
    });
  }

  submitProposalForm() {
    if (!this.proposalForm.valid) {
      this._snackBar.open("Invalid Form State", "close", {
        duration: 5000,
        panelClass: "error"
      });
      return;
    }

    this.api.submitProposalCreateRequest({
      title: this.proposalForm.controls.title.value,
      description: this.proposalForm.controls.description.value,
      computorId: this.proposalForm.controls.computorId.value,
      option1: this.proposalForm.controls.option1.value,
      option2: this.proposalForm.controls.option2.value,
      option3: this.proposalForm.controls.option3.value,
      option4: this.proposalForm.controls.option4.value,
      option5: this.proposalForm.controls.option5.value,
      option6: this.proposalForm.controls.option6.value,
      option7: this.proposalForm.controls.option7.value,
    }).subscribe(s => {
      this.proposalToPublish = s;
      this.stepper.next();
    }, e => {
      this._snackBar.open("Error. Please Try Again Later", "close", {
        duration: 5000,
        panelClass: "error"
      });
    });
  }

  loadKey() {
    const dialogRef = this.dialog.open(UnLockComponent, { restoreFocus: false });
  }

}
