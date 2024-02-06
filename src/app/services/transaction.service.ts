import { Injectable } from '@angular/core';
import { TranslocoService } from '@ngneat/transloco';
import { QubicConnector } from 'qubic-ts-library/dist/QubicConnector';
import { QubicPackageBuilder } from 'qubic-ts-library/dist/QubicPackageBuilder';
import { QubicPackageType } from 'qubic-ts-library/dist/qubic-communication/QubicPackageType';
import { RequestResponseHeader } from 'qubic-ts-library/dist/qubic-communication/RequestResponseHeader';
import { ApiService } from './api.service';
import { UpdaterService } from './updater-service';
import { WalletService } from './wallet.service';
import { VisibilityService } from './visibility.service';
import { QubicTransaction } from 'qubic-ts-library/dist/qubic-types/QubicTransaction';
import { lastValueFrom } from 'rxjs';


/**
 * Transaction Service to send transaction to the qubic network
 */
@Injectable({
    providedIn: 'root'
})
export class TransactionService {

    constructor(private t: TranslocoService, private visibilityService: VisibilityService, private updateService: UpdaterService, private walletService: WalletService, private api: ApiService) {

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
                this.updateService.addQubicTransaction(qtx);
                if (callbackFn) {
                    callbackFn({
                        success: true
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

        if(!(await qtx.sourcePublicKey.verifyIdentity())){
            return {
                success: false,
                message: "Invalid Source Address"
            };
        }

        if(!(await qtx.destinationPublicKey.verifyIdentity())){
            return {
                success: false,
                message: "Invalid Destination Address"
            };
        }

        // if we are using bridged mode, the transaction is sent directly to the network and is not prxied through qli backend
        if (this.walletService.getSettings().useBridge) {
            return new Promise((resolve) => {
                this.directPush(qtx, (r) => {
                    resolve(r);
                });
            })
        }
        else {

            const binaryData = qtx.getPackageData();

            // submit transaction to the qli api/proxy
            const apiResult = await lastValueFrom(this.api.submitTransaction({ SignedTransaction: this.walletService.arrayBufferToBase64(binaryData) }));

            if (apiResult && apiResult.id) {
                // transaction was submitted successful
                this.updateService.loadCurrentBalance(); // reload balance to get created tx into list of tx's

                return {
                    success: true
                };
            }
            else // failed to submit solution to qli api
            {

                return {
                    success: true,
                    message: this.t.translate('paymentComponent.messages.failedToSend')
                };
            }

        }
    }


}

interface ITransactionPublishResult {
    success: boolean;
    message?: string;
}