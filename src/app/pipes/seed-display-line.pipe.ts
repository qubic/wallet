import { Pipe, PipeTransform } from '@angular/core';
import { shortenAddress } from '../utils/address.utils';

/**
 * Pipe for displaying individual lines of seed information.
 * Used in combination with template structure for multi-line displays.
 *
 * Usage in mat-option for two-line display:
 *
 * <mat-option *ngFor="let seed of seeds" [value]="seed.publicId">
 *   {{ seed | seedFirstLine }}<br />
 *   {{ seed | seedSecondLine: t('general.currency') }}
 * </mat-option>
 */

@Pipe({
  name: 'seedFirstLine'
})
export class SeedFirstLinePipe implements PipeTransform {
  transform(seed: any): string {
    if (!seed) {
      return '';
    }

    const alias = seed.alias || '';
    const shortAddress = seed.publicId ? shortenAddress(seed.publicId) : '';

    return shortAddress ? `${alias} (${shortAddress})` : alias;
  }
}

@Pipe({
  name: 'seedSecondLine'
})
export class SeedSecondLinePipe implements PipeTransform {
  transform(seed: any, currencyLabel?: string): string {
    if (!seed || seed.balance === undefined || seed.balance === null) {
      return '';
    }

    const balanceStr = seed.balance.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    return currencyLabel ? `${balanceStr} ${currencyLabel}` : balanceStr;
  }
}
