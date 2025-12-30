import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { AbstractControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-stake-input',
  templateUrl: './stake-input.component.html',
  styleUrls: ['./stake-input.component.scss'],
})
export class StakeInputComponent implements OnChanges {
  @Input() formGroup!: FormGroup;
  @Input() maxAmount: number = 0;

  get amountControl(): AbstractControl {
    return this.formGroup.get('amount')!;
  }

  onInputChange(event: any) {
    const value = event?.target?.value || '';
    // Remove decimal point and everything after it
    const integerPart = value.split('.')[0].split(',')[0];
    const numericalValue = Number(integerPart.replace(/\D/g, ''));

    this.amountControl.setValue(numericalValue, { emitEvent: false });
    this.validateAmount(this.maxAmount);
  }

  validateAmount(maxAmount: number): void {
    const minRequiredBalance = 1;
    this.amountControl.setValidators([
      Validators.required,
      Validators.min(10000000),
      Validators.max(maxAmount),
      Validators.min(minRequiredBalance)
    ]);
    this.amountControl.updateValueAndValidity();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['maxAmount'] && changes['maxAmount'].currentValue !== changes['maxAmount'].previousValue) {
      this.validateAmount(this.maxAmount);
    }
  }
}
