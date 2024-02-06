import { Component, OnDestroy, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { WalletService } from '../../services/wallet.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@ngneat/transloco';
import { BalanceResponse, ProposalDto, Transaction } from '../../services/api.model';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { UpdaterService } from '../../services/updater-service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { QubicHelper } from 'qubic-ts-library/dist//qubicHelper';
import { UnLockComponent } from 'src/app/lock/unlock/unlock.component';

export interface ComputorSelected {
  name: string;
  completed: boolean;
  subComputors?: ComputorSelected[];
  published: boolean;
  index?: number;
  data?: string;
  publishing: boolean;
  publishStarted?: number;
}

@Component({
  selector: 'app-voting-participate',
  templateUrl: './voting-participate.component.html',
  styleUrls: ['./voting-participate.component.scss']
})
export class VotingParticipateComponent implements OnInit, OnDestroy {

  public accountBalances: BalanceResponse[] = [];
  public seedFilterFormControl: FormControl = new FormControl();
  public currentTick = 0;
  public userServiceSubscription: Subscription | undefined;
  public proposals: ProposalDto[] | undefined;
  public proposal: ProposalDto | undefined;
  private sub: any;
  private triedToload = false;
  public votes: number[] = new Array(676);
  public computorTree: ComputorSelected = {
    completed: false,
    name: "All Computors",
    subComputors: [],
    published: false,
    publishing: false
  };
  public allComputors = false;
  private publishInterval:any;
  private globalPublishTimeout: number | undefined;

  private ws = new WebSocket('wss://webbridge.qubic.li/');
  private isWsConnected = false;
  private peerConnected = false;
  public isPublishing = false;

  public publishForm = this.fb.group({
    operatorId: [localStorage.getItem("lastOperatorId"), [Validators.required]],
    computorIp: [localStorage.getItem("lastComputorIp"), [Validators.required]]
  });

  constructor(private router: Router, private transloco: TranslocoService, private api: ApiService, public walletService: WalletService, private _snackBar: MatSnackBar, private us: UpdaterService
    , private route: ActivatedRoute
    , private fb: FormBuilder
    , private dialog: MatDialog
  ) {

    for (let i = 0; i < 676; i++) {
      this.votes[i] = 0;
    }
  }
  ngOnDestroy(): void {
    if (this.userServiceSubscription)
      this.userServiceSubscription.unsubscribe();
    if (this.sub)
      this.sub.unsubscribe();
    if (this.ws) {
      this.ws.close();
    }
    clearInterval(this.publishInterval);
  }

  ngOnInit(): void {
    this.api.currentProposals.subscribe(s => {
      if (s.length == 0 && !this.triedToload) {
        this.triedToload = true;
        this.api.getProposals().subscribe();
      } else {
        this.proposals = s;
        if (this.hasSeeds()) {
          this.userServiceSubscription = this.us.currentBalance.subscribe(response => {
            this.accountBalances = response;
            this.init();
          }, errorResponse => {
            this._snackBar.open(errorResponse.error, this.transloco.translate("general.close"), {
              duration: 0,
              panelClass: "error"
            });
          });
        } else {
          this.init();
        }
      }
    });
    this.initializeBridge();
  }
  init(): void {
    if ((this.computorTree.subComputors?.length ?? 0) > 0)
      return;
    this.computorTree.subComputors = this.getComputors().map(m => {
      return {
        name: this.getSeedName(m.publicId),
        completed: false,
        published: false,
        publishing: false,
        index: this.accountBalances.find(q => m.publicId == q.publicId)?.computorIndex
      }
    });
  }

  toBase64(u8: any): string {
    return btoa(String.fromCharCode.apply(null, u8));
  }
  private connectedPeerAddress: string | undefined;
  connectPeer(ipAddress: string): void {
    this.ws.send(JSON.stringify(
      {
        command: 'connect',
        host: ipAddress,
        port: 21841
      }
    ));
    this.connectedPeerAddress = ipAddress;
  }
  disconnectPeer(): void {
    if(this.connectedPeerAddress){
      this.ws.send(JSON.stringify(
        {
          command: 'disconnect',
          host: this.connectedPeerAddress,
          port: 21841
        }
      ));
      this.connectedPeerAddress = undefined;
      this.peerConnected = false;
    }
  }
  sendBallot() {
    if(!this.isPublishing)
      return;

    var comp = this.computorTree.subComputors?.find(f => f.completed && !f.published);
    if(comp){
      if(!comp.data || comp.publishing && (comp.publishStarted! + (2*1000) < Date.now())){
        comp.publishing = false;
        comp.publishStarted = undefined;
        comp.data = undefined;
        this.createPacket(comp);
      }else {
        comp.publishStarted = Date.now();
        comp.publishing = true;
        this.ws.send(JSON.stringify(
          {
            command: 'sendb',
            data: comp?.data
          }
        ));
      }

      if(this.globalPublishTimeout  && this.globalPublishTimeout < Date.now()){
        // global timeout reached.
        this._snackBar.open("Global Timout Reached. Publish Has Been Stopped.", "close", {
          duration: 10000,
          panelClass: "error"
        });
        this.cancelPublish();
      }

    }else {
      this.isPublishing = false;
      this._snackBar.open("Votes has been sent.", "close", {
        duration: 5000,
        panelClass: 'success'
      });
    }

  }

  reconnectPeer() {
    this.disconnectPeer(); // disconnect
    // reset current publishing
    this.computorTree.subComputors?.filter(f => f.publishing).forEach((comp) => {
      comp.data = undefined;
      comp.publishing = false;
      comp.publishStarted = undefined;
    });
  }

  cancelPublish(){
    clearInterval(this.publishInterval);
    this.disconnectPeer();
    this.computorTree.subComputors?.forEach((comp) => {
      comp.data = undefined;
      comp.publishing = false;
      comp.publishStarted = undefined;
    });
    this.isPublishing = false;
  }
  createPacket(comp: ComputorSelected) {
    this.walletService.revealSeed((<any>this.publishForm.controls.operatorId.value)).then(operatorSeed => {
      this.api.currentProtocol.subscribe(protocol => {
        var computors = this.getSelectedComputors();
        if (computors?.length ?? 0 > 0) {
          new QubicHelper().createBallotRequests(protocol, operatorSeed, [comp.index!], this.votes.map(m => +m)).then(ballots => {
            if(ballots && ballots.length > 0){
              comp.data = this.toBase64(ballots[0]);
            }
            if(!this.peerConnected)
              this.connectPeer(this.publishForm.controls.computorIp.value!);
          });
        }
      });

    }).catch(e => {
      this._snackBar.open("We were not able to decrypt your seed. Did you use the correct private key??", "close", {
        duration: 10000,
        panelClass: "error"
      });
    });
  }

  onPeerConnect() {
    this.peerConnected = true;
  }

  initializeBridge(): void {
    this.ws.onmessage = (event: any): void => {
      const jsonData = JSON.parse(event.data);
      if (jsonData.message === 'connect done') {
        this.onPeerConnect();
      } else if (jsonData.message && jsonData.message.indexOf("ConnectionResetError") >= 0)
      {
        // when the peer closes the conection this error occures. if we are publishing we want to reconnect now
        
        this.reconnectPeer();

      }
      else if (jsonData.message === 'recv data') {
        const byteArray = Uint8Array.from(atob(jsonData.data), c => c.charCodeAt(0));
        if (byteArray[3] === 4) {
          const bytes = new Uint8Array([byteArray[17], byteArray[16]]);
          const dataView = new DataView(bytes.buffer);
          const value = dataView.getUint16(0, false);
          const comp = this.computorTree.subComputors?.find(f => f.index == value);
          if (comp){
            comp.completed = false;
            comp.published = true;
            comp.publishing = false;
          }

        }
      }
    };
    this.ws.onopen = (): void => {
      this.isWsConnected = true;
      this.startInterval();
    };
    this.ws.onclose = (): void => {
      this.isWsConnected = false;
      this.peerConnected = false;
      clearInterval(this.publishInterval);
    };
  }

  startInterval() {
    clearInterval(this.publishInterval);
    this.publishInterval = setInterval(() => {
      this.sendBallot();
    }, 500);
  }

  getDate() {
    return new Date();
  }

  getProposals() {
    return this.proposals?.filter(f => f.status === 2 /* pending */);
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

  getSeeds() {
    return this.walletService.getSeeds();
  }
  getComputors() {
    return this.walletService.getSeeds().filter(f =>
      this.accountBalances.find(q => q.isComputor && f.publicId == q.publicId)
      &&
      !this.proposals?.find(q => q.computorId == f.publicId && q.isPublished)
    );
  }
  getSelectedComputors() {
    return this.computorTree.subComputors?.filter(f => f.completed)
  }
  getSelectedComputorCount(): number {
    return this.getSelectedComputors()?.length ?? 0;
  }

  repeat(transaction: Transaction) {
    this.router.navigate(['payment'], {
      state: {
        template: transaction
      }
    });
  }

  hasComputors() {
    return this.getComputors().length > 0;
  }

  updateAllComplete() {
    this.allComputors = this.computorTree.subComputors != null && this.computorTree.subComputors.every(t => t.completed);
  }


  someComplete(): boolean {
    if (this.computorTree.subComputors == null) {
      return false;
    }
    return this.computorTree.subComputors.filter(t => t.completed).length > 0 && !this.allComputors;
  }

  setAll(completed: boolean) {
    this.allComputors = completed;
    if (this.computorTree.subComputors == null) {
      return;
    }
    this.computorTree.subComputors.forEach(t => (t.completed = completed));
  }

  setComputor(comp: ComputorSelected, ev: any) {
    comp.completed = ev;
  }

  sendVotes() {
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
    if ((this.computorTree.subComputors?.filter(f => f.completed).length ?? 0) <= 0) {
      this._snackBar.open("Must select at least one Computor.", "close", {
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

    if(this.votes.filter(f => f !== 0).length <= 0){
      this._snackBar.open("At least one Vote should be selected.", "close", {
        duration: 5000,
        panelClass: "error"
      });
      return;
    }
    // save ip and operator
    localStorage.setItem("lastComputorIp", this.publishForm.controls.computorIp.value!);
    localStorage.setItem("lastOperatorId", this.publishForm.controls.operatorId.value!);

    this.isPublishing = true;

    // var computors = this.getSelectedComputors();
    // if (computors?.length ?? 0 > 0) {
    //   computors!.forEach(comp => {
    //     this.createPacket(comp);
    //   });
    // }
    this.globalPublishTimeout = Date.now() + (this.getSelectedComputors()?.length! * 10 * 1000);
    this.startInterval();


    // create package

    // this.walletService.revealSeed((<any>this.publishForm.controls.operatorId.value)).then(operatorSeed => {
    //   this.api.currentProtocol.subscribe(protocol => {
    //     var computors = this.getSelectedComputors();
    //     if (computors?.length ?? 0 > 0) {
    //       new QubicHelper().createBallotRequests(protocol, operatorSeed, computors!.map(m => m.index!), this.votes.map(m => +m)).then(ballots => {
    //         ballots.forEach(ballot => {
    //           this.dataPackageToSend?.push(this.toBase64(ballot));
    //         });
    //         // connect
    //         this.connectPeer(this.publishForm.controls.computorIp.value!);
    //       });
    //     }
    //   });

    // }).catch(e => {
    //   this._snackBar.open("We were not able to decrypt your seed. Did you use the correct private key??", "close", {
    //     duration: 10000,
    //     panelClass: "error"
    //   });
    // });

  }

  loadKey() {
    const dialogRef = this.dialog.open(UnLockComponent, { restoreFocus: false });
  }
}
