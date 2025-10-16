import { Pipe, PipeTransform } from '@angular/core';
import { shortenAddress } from '../utils/address.utils';

export interface SeedDisplayOptions {
  showAddress?: boolean;
  showBalance?: boolean;
  showCurrency?: boolean;
  compact?: boolean; // Single line vs multi-line
  currencyLabel?: string;
}

/**
 * Pipe for formatting seed display in a consistent way across the application.
 *
 * Usage examples:
 *
 * Compact format (selected/inline):
 * {{ seed | seedDisplay: { compact: true, currencyLabel: 'QUBIC' } }}
 * Output: "Alias (ABCD...WXYZ) - 1234567 QUBIC"
 *
 * Multi-line format (dropdown):
 * {{ seed | seedDisplay: { compact: false, currencyLabel: 'QUBIC' } }}
 * Output: "Alias (ABCD...WXYZ)\n1234567 QUBIC"
 *
 * Address only:
 * {{ seed | seedDisplay: { showAddress: true, showBalance: false } }}
 * Output: "Alias (ABCD...WXYZ)"
 */
@Pipe({
  name: 'seedDisplay'
})
export class SeedDisplayPipe implements PipeTransform {

  transform(seed: any, options?: SeedDisplayOptions): string {
    if (!seed) {
      return '';
    }

    const opts: SeedDisplayOptions = {
      showAddress: true,
      showBalance: true,
      showCurrency: true,
      compact: true,
      currencyLabel: '',
      ...options
    };

    const parts: string[] = [];

    // Build the first line: Alias (Address)
    let firstLine = seed.alias || '';

    if (opts.showAddress && seed.publicId) {
      const shortAddress = shortenAddress(seed.publicId);
      firstLine += ` (${shortAddress})`;
    }

    parts.push(firstLine);

    // Build the second line: Balance Currency
    if (opts.showBalance && seed.balance !== undefined && seed.balance !== null) {
      const balanceStr = this.formatNumber(seed.balance);
      const secondLine = opts.showCurrency && opts.currencyLabel
        ? `${balanceStr} ${opts.currencyLabel}`
        : balanceStr;

      parts.push(secondLine);
    }

    // Join based on compact mode
    if (opts.compact) {
      // Single line with dash separator
      return parts.join(' - ');
    } else {
      // Multi-line with <br> tag
      return parts.join('<br />');
    }
  }

  private formatNumber(value: number): string {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }
}
