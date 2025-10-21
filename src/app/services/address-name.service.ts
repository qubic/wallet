import { Injectable } from '@angular/core';
import { Observable, combineLatest, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { QubicStaticService } from './apis/static/qubic-static.service';
import { WalletService } from './wallet.service';
import { ApiService } from './api.service';
import { AddressNameResult } from './apis/static/qubic-static.model';
import { ISeed } from '../model/seed';
import { EMPTY_QUBIC_ADDRESS } from '../utils/address.utils';

/**
 * Service for resolving addresses to human-readable names
 *
 * Priority system (highest to lowest):
 * 1. Account (wallet's own accounts)
 * 2. Smart Contract
 * 3. Exchange
 * 4. Token (asset issuer)
 * 5. Address Label (named address)
 */
@Injectable({
  providedIn: 'root'
})
export class AddressNameService {

  constructor(
    private staticService: QubicStaticService,
    private walletService: WalletService,
    private apiService: ApiService
  ) {}

  /**
   * Get the display name synchronously using cached data
   * This is useful for components that need immediate results
   *
   * @param address The address to resolve
   * @returns AddressNameResult or undefined if no match found
   */
  public getAddressName(address: string): AddressNameResult | undefined {
    if (!address) {
      return undefined;
    }

    // Priority 1: Check wallet accounts
    const seeds = this.walletService.getSeeds();
    const accountMatch = this.findAccountMatch(address, seeds);
    if (accountMatch) {
      return accountMatch;
    }

    // Priority 2: Check smart contracts
    const smartContracts = this.staticService.cachedSmartContracts;
    if (smartContracts) {
      const smartContract = smartContracts.find(sc => sc.address === address);
      if (smartContract) {
        return {
          name: smartContract.name,
          type: 'smart-contract',
          website: smartContract.website
        };
      }
    }

    // Priority 3: Check exchanges
    const exchanges = this.staticService.cachedExchanges;
    if (exchanges) {
      const exchange = exchanges.find(ex => ex.address === address);
      if (exchange) {
        return {
          name: exchange.name,
          type: 'exchange'
        };
      }
    }

    // Priority 4: Check tokens
    const tokens = this.staticService.cachedTokens;
    const tokenMatch = this.findTokenMatch(address, tokens);
    if (tokenMatch) {
      return tokenMatch;
    }

    // Priority 5: Check address labels
    const addressLabels = this.staticService.cachedAddressLabels;
    if (addressLabels) {
      const addressLabel = addressLabels.find(label => label.address === address);
      if (addressLabel) {
        return {
          name: addressLabel.label,
          type: 'address-label'
        };
      }
    }

    return undefined;
  }

  /**
   * Get smart contract details by address
   */
  public getSmartContractByAddress(address: string): Observable<any> {
    return this.staticService.smartContracts$.pipe(
      map(contracts => contracts?.find(sc => sc.address === address))
    );
  }

  /**
   * Get smart contract details synchronously
   */
  public getSmartContractByAddressSync(address: string): any {
    const smartContracts = this.staticService.cachedSmartContracts;
    return smartContracts?.find(sc => sc.address === address);
  }

  /**
   * Get a formatted display string for an address with its name
   *
   * @param address The address to format
   * @param includeAddress Whether to include the address in parentheses
   * @returns Formatted display string
   */
  public getFormattedAddressName(address: string, includeAddress: boolean = true): string {
    const result = this.getAddressName(address);

    if (!result) {
      return address;
    }

    if (includeAddress) {
      return `${result.name} (${this.shortenAddress(address)})`;
    }

    return result.name;
  }

  /**
   * Find account match in wallet seeds
   */
  private findAccountMatch(address: string, seeds: ISeed[]): AddressNameResult | undefined {
    const seed = seeds.find(s => s.publicId === address);
    if (seed) {
      return {
        name: seed.alias,
        type: 'account'
      };
    }
    return undefined;
  }

  /**
   * Find token match
   * Note: This is a simplified version. In a full implementation, this would
   * check against actual asset issuances to match issuer identities
   */
  private findTokenMatch(address: string, tokens: any[] | null): AddressNameResult | undefined {
    // This would need to be enhanced with actual asset issuance data
    // For now, we return undefined as we don't have a direct address -> token mapping
    // The full implementation would require fetching asset issuances and matching issuerIdentity
    return undefined;
  }

  /**
   * Shorten an address for display
   */
  private shortenAddress(address: string): string {
    if (address.length <= 10) {
      return address;
    }
    return `${address.slice(0, 5)}...${address.slice(-5)}`;
  }
}
