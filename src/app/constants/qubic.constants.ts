/**
 * Qubic Application Constants
 *
 * This file contains constant values used throughout the Qubic Wallet application.
 */

import { QubicDefinitions } from '@qubic-lib/qubic-ts-library/dist/QubicDefinitions';

/**
 * Standard length of a Qubic public address
 */
export const QUBIC_ADDRESS_LENGTH = 60;

/**
 * Maximum number of accounts that can be added to the wallet
 * This limit is enforced for performance optimization reasons
 */
export const MAX_WALLET_ACCOUNTS = 15;

/**
 * Fee required for transferring assets (managed by QX)
 * Sourced from QubicDefinitions.QX_TRANSFER_ASSET_FEE
 */
export const ASSET_TRANSFER_FEE = QubicDefinitions.QX_TRANSFER_ASSET_FEE;
