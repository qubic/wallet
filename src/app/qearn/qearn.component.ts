import { Component, OnInit, ViewChild } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import { WalletService } from "../services/wallet.service";
import { Transaction } from "../services/api.model";

@Component({
  selector: "app-qearn",
  templateUrl: "./qearn.component.html",
  styleUrls: ["./qearn.component.scss"],
})
export class QearnComponent implements OnInit {
  public maxAmount: number = 0;
  public currentTick = 0;
  public isBroadcasting = false;

  @ViewChild("selectedDestinationId", {
    static: false,
  })

  public tickOverwrite = false;
  public selectedAccountId = false;


  constructor(private fb: FormBuilder, public walletService: WalletService) {}

  ngOnInit(): void {}
}
