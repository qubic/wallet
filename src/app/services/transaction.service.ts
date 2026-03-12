import { Injectable } from '@angular/core';
import { TranslocoService } from '@ngneat/transloco';
import { QubicConnector } from '@qubic-lib/qubic-ts-library/dist/QubicConnector';
import { QubicPackageBuilder } from '@qubic-lib/qubic-ts-library/dist/QubicPackageBuilder';
import { QubicPackageType } from '@qubic-lib/qubic-ts-library/dist/qubic-communication/QubicPackageType';
import { RequestResponseHeader } from '@qubic-lib/qubic-ts-library/dist/qubic-communication/RequestResponseHeader';
import { ApiService } from './api.service';
import { ContractDto } from './api.model';
import { WalletService } from './wallet.service';
import { ApiLiveService } from './apis/live/api.live.service';
import { PendingTransactionService } from './pending-transaction.service';
import { QubicTransaction } from '@qubic-lib/qubic-ts-library/dist/qubic-types/QubicTransaction';
import { QubicHelper } from '@qubic-lib/qubic-ts-library/dist/qubicHelper';
import { lastValueFrom } from 'rxjs';

const IPO_INPUT_TYPE = 1;

/**
 * Transaction Service to send transaction to the qubic network
 */
@Injectable({
    providedIn: 'root'
})
export class TransactionService {

    constructor(
        private t: TranslocoService,
        private walletService: WalletService,
        private api: ApiService,
        private apiLiveService: ApiLiveService,
        private pendingTxService: PendingTransactionService
    ) {

    }

    /**
     * sends the tx directly to the network (via websocket bridge)
     * 
     * @param qtx the qubic transaction to publish to the network
     * @param callbackFn callback function got's called when tx is published or any error happened
     */
    private async directPush(qtx: QubicTransaction, callbackFn?: (result: ITransactionPublishResult) => void) {

        // create header
        const header = new RequestResponseHeader(QubicPackageType.BROADCAST_TRANSACTION, qtx.getPackageSize());
        const builder = new QubicPackageBuilder(header.getSize());
        builder.add(header);
        builder.add(qtx);
        const transactionBinaryData = builder.getData();

        let transactionSent = false;

        // create a dedicated connection to the network
        const qubicConnector = new QubicConnector(this.walletService.getRandomWebBridgeUrl());

        // event when websocket to bridge is established
        qubicConnector.onReady = () => {
            // choose random
            qubicConnector.connect(this.api.currentPeerList.getValue()[0].ipAddress);
        }
        // event when we have connection to the qubic node/peer
        qubicConnector.onPeerConnected = () => {
            // send transaction
            if (qubicConnector.sendPackage(transactionBinaryData)) {
                transactionSent = true;
                if (callbackFn) {
                    callbackFn({
                        success: true,
                        txId: qtx.getId()
                    });
                }
            } else {
                if (callbackFn) {
                    callbackFn({
                        success: false,
                        message: this.t.translate('paymentComponent.messages.failedToSend')
                    });
                }
            }
            qubicConnector.stop();
        }
        qubicConnector.start(); // start publishing
        // timeout for publishing a transaction. if there is no result in 2 seconds it has failed
        window.setTimeout(() => {
            if (!transactionSent && callbackFn) {
                callbackFn({
                    success: false,
                    message: this.t.translate('general.messages.timeoutTryAgain')
                });
            }
        }, 2000);
    }


    /**
     * Publish a Qubic Transaction to the network
     * 
     * @param qtx an already built/signed tx
     * @returns status of publish
     */
    public async publishTransaction(qtx: QubicTransaction): Promise<ITransactionPublishResult> {

        // todo: create proper error response/handling
        // todo: implement more logical checks if the tx is valid (e.g. size, valid source/dest address)

        if (!qtx.getId()) {
            console.error("Transaction must be built before publishing");
            return {
                success: false,
                message: "Transaction must be built before publishing"
            };
        }

        if (!(await qtx.sourcePublicKey.verifyIdentity())) {
            return {
                success: false,
                message: "Invalid Source Address"
            };
        }

        if (!(await qtx.destinationPublicKey.verifyIdentity())) {
            return {
                success: false,
                message: "Invalid Destination Address"
            };
        }

        // if we are using bridged mode, the transaction is sent directly to the network
        if (this.walletService.getSettings().useBridge) {
            return new Promise((resolve) => {
                this.directPush(qtx, (r) => {
                    if (r.success) {
                        this.storePendingTransaction(qtx);
                    }
                    resolve(r);
                });
            })
        }
        else {
            const binaryData = qtx.getPackageData();
            const encodedTransaction = this.walletService.arrayBufferToBase64(binaryData);

            try {
                const apiResult = await lastValueFrom(this.apiLiveService.broadcastTransaction(encodedTransaction));
                if (apiResult && apiResult.transactionId) {
                    this.storePendingTransaction(qtx);
                    return { success: true, txId: apiResult.transactionId };
                } else {
                    return {
                        success: false,
                        message: this.t.translate('paymentComponent.messages.failedToSend')
                    };
                }
            } catch (error) {
                console.error('Transaction broadcast failed:', error instanceof Error ? error.message : 'Unknown error');
                return {
                    success: false,
                    message: this.t.translate('paymentComponent.messages.failedToSend')
                };
            }
        }
    }

    /**
     * Build, broadcast and track an IPO bid transaction.
     *
     * @param seed the sender's decrypted seed
     * @param sourceId the sender's public ID
     * @param contract the IPO contract
     * @param price bid price per unit
     * @param quantity number of units to bid for
     * @param targetTick the tick the transaction targets
     * @returns status of broadcast including the transaction ID on success
     */
    public async submitIpoTransaction(seed: string, sourceId: string, contract: ContractDto, price: number, quantity: number, targetTick: number): Promise<ITransactionPublishResult> {
        try {
            const tx = await new QubicHelper().createIpo(seed, contract.index, price, quantity, targetTick);
            const encodedTransaction = this.walletService.arrayBufferToBase64(tx);
            const apiResult = await lastValueFrom(this.apiLiveService.broadcastTransaction(encodedTransaction));
            if (apiResult && apiResult.transactionId) {
                this.pendingTxService.addPendingTransaction({
                    txId: apiResult.transactionId,
                    sourceId,
                    destId: contract.id,
                    amount: 0,
                    tickNumber: targetTick,
                    inputType: IPO_INPUT_TYPE,
                    isPending: true,
                    created: new Date(),
                });
                return { success: true, txId: apiResult.transactionId };
            } else {
                return {
                    success: false,
                    message: this.t.translate('paymentComponent.messages.failedToSend')
                };
            }
        } catch (error) {
            console.error('IPO transaction broadcast failed:', error instanceof Error ? error.message : 'Unknown error');
            return {
                success: false,
                message: this.t.translate('paymentComponent.messages.failedToSend')
            };
        }
    }

    private storePendingTransaction(qtx: QubicTransaction): void {
        const payload = qtx.getPayload();
        const inputHex = payload
            ? Array.from(payload.getPackageData()).map(b => b.toString(16).padStart(2, '0')).join('')
            : undefined;
        const tx = {
            txId: qtx.getId(),
            sourceId: qtx.sourcePublicKey.getIdentityAsSring() ?? '',
            destId: qtx.destinationPublicKey.getIdentityAsSring() ?? '',
            amount: Number(qtx.amount.getNumber()),
            tickNumber: qtx.tick,
            inputType: qtx.inputType,
            inputHex,
            isPending: true,
            created: new Date(),
        };
        this.pendingTxService.addPendingTransaction(tx);
    }
}

export interface ITransactionPublishResult {
    success: boolean;
    message?: string;
    txId?: string;
}