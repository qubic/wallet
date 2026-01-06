import { Directive, HostListener, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { NgControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { parseFormattedInteger } from '../helpers/number-input.helper';

@Directive({
  selector: '[appAmountInput]'
})
export class AmountInputDirective implements OnInit, OnDestroy {
  private lastValidValue: number = 0;
  private valueChangesSub?: Subscription;

  constructor(private el: ElementRef<HTMLInputElement>, private control: NgControl) {}

  ngOnInit() {
    this.lastValidValue = this.control.value || 0;

    // Track when value is cleared programmatically (e.g., clear button)
    this.valueChangesSub = this.control.control?.valueChanges.subscribe(value => {
      if (value === null || value === undefined) {
        this.lastValidValue = 0;
      }
    });
  }

  ngOnDestroy() {
    this.valueChangesSub?.unsubscribe();
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (event.key.length === 1 && !/[0-9]/.test(event.key) && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
    }
  }

  @HostListener('input')
  onInput() {
    const input = this.el.nativeElement;
    const parsed = parseFormattedInteger(input.value || '');

    // Reject invalid format or values exceeding safe integer limit
    if (parsed === null || parsed > Number.MAX_SAFE_INTEGER) {
      this.control.control?.setValue(this.lastValidValue, { emitEvent: false });
      input.value = this.lastValidValue ? '' + this.lastValidValue : '';
      return;
    }

    this.lastValidValue = parsed;
    this.control.control?.setValue(parsed, { emitEvent: false });
    input.value = '' + parsed;
  }
}
