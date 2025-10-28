import { environment } from '../../environments/environment';

/**
 * Helper class for building Qubic Explorer URLs
 */
export class ExplorerUrlHelper {
  /**
   * Get the URL for an address page
   * @param address The Qubic address/public ID
   * @returns Full URL to the address page on the explorer
   */
  static getAddressUrl(address: string): string {
    return `${environment.explorerUrl}/network/address/${address}`;
  }

  /**
   * Get the URL for a transaction page
   * @param txId The transaction ID
   * @returns Full URL to the transaction page on the explorer
   */
  static getTransactionUrl(txId: string): string {
    return `${environment.explorerUrl}/network/tx/${txId}`;
  }

  /**
   * Get the URL for a tick page
   * @param tick The tick number
   * @returns Full URL to the tick page on the explorer
   */
  static getTickUrl(tick: number | string): string {
    return `${environment.explorerUrl}/network/tick/${tick}`;
  }
}
