# Seed Display Pipes Usage Guide

## Overview
Three custom pipes provide consistent seed/account display formatting across the application.

## Available Pipes

### 1. `seedDisplay` - Single Line Format
Used for compact displays (mat-select-trigger, inline text)

```html
<mat-select-trigger>
  <span *ngIf="selectedSeed">
    {{ selectedSeed | seedDisplay: { compact: true, currencyLabel: t('general.currency') } }}
  </span>
</mat-select-trigger>
```
**Output:** `Alias (ABCD...WXYZ) - 1234567 QUBIC`

### 2. `seedFirstLine` - First Line of Two-Line Display
Shows alias and shortened address

```html
{{ seed | seedFirstLine }}
```
**Output:** `Alias (ABCD...WXYZ)`

### 3. `seedSecondLine` - Second Line of Two-Line Display
Shows balance and currency

```html
{{ seed | seedSecondLine: t('general.currency') }}
```
**Output:** `1234567 QUBIC`

## Complete Examples

### Mat-Select with Trigger + Options
```html
<mat-select formControlName="seedSelect">
  <!-- Single line when selected -->
  <mat-select-trigger>
    <span *ngIf="getSelectedSeed()">
      {{ getSelectedSeed() | seedDisplay: { compact: true, currencyLabel: t('general.currency') } }}
    </span>
  </mat-select-trigger>

  <!-- Two lines in dropdown -->
  <mat-option *ngFor="let seed of seeds" [value]="seed.publicId">
    {{ seed | seedFirstLine }}<br />{{ seed | seedSecondLine: t('general.currency') }}
  </mat-option>
</mat-select>
```

## Recommended Approach

**All seed displays now use pipes!**

- ✅ **Single-line** (triggers): Use `seedDisplay` pipe
- ✅ **Two-line** (dropdown options): Use `seedFirstLine` + `seedSecondLine` pipes
- ✅ **Consistent** formatting across all components
- ✅ **Centralized** logic - change once, applies everywhere

## Options (seedDisplay pipe only)

```typescript
{
  showAddress?: boolean;    // default: true
  showBalance?: boolean;    // default: true
  showCurrency?: boolean;   // default: true
  compact?: boolean;        // default: true
  currencyLabel?: string;   // default: ''
}
```

**Examples:**
- Address only: `{{ seed | seedDisplay: { showBalance: false } }}`
- Balance only: `{{ seed | seedDisplay: { showAddress: false, currencyLabel: 'QUBIC' } }}`

## Use Cases

**Single-Line:** `seedDisplay` pipe
- mat-select-trigger, card headers, table cells, tooltips, inline text

**Two-Line:** `seedFirstLine` + `seedSecondLine` pipes
- mat-option dropdowns, list items, vertical displays
