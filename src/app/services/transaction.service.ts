import { Injectable } from '@angular/core';
import { TranslocoService } from '@ngneat/transloco';
import { ContractDto } from './api.model';
import { WalletService } from './wallet.service';
import { ApiLiveService } from './apis/live/api.live.service';
import { PendingTransactionService } from './pending-transaction.service';
import { QubicTransaction } from '@qubic-lib/qubic-ts-library/dist/qubic-types/QubicTransaction';
import { QubicHelper } from '@qubic-lib/qubic-ts-library/dist/qubicHelper';
import { lastValueFrom } from 'rxjs';
import { IPO_INPUT_TYPE } from '../constants/qubic.constants';
import { bytesToHex } from '../utils/hex.utils';

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
        private apiLiveService: ApiLiveService,
        private pendingTxService: PendingTransactionService
    ) {

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
                    inputHex: this.encodeIpoInputHex(price, quantity),
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

    /**
     * Builds the 16-byte IPO bid input payload (price + quantity + zero padding)
     * and returns it as a lowercase hex string. Layout matches QubicHelper.createIpo:
     *   bytes 0-7   price    (int64, little-endian)
     *   bytes 8-9   quantity (int16, little-endian)
     *   bytes 10-15 zero padding
     */
    private encodeIpoInputHex(price: number, quantity: number): string {
        const input = new Uint8Array(16);
        const view = new DataView(input.buffer);
        view.setBigInt64(0, BigInt(price), true);
        view.setInt16(8, quantity, true);
        return bytesToHex(input);
    }

    private storePendingTransaction(qtx: QubicTransaction): void {
        const payload = qtx.getPayload();
        const inputHex = payload
            ? bytesToHex(payload.getPackageData())
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