import { Component, Input, Output, EventEmitter } from '@angular/core';
import { AbstractControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-stake-input',
  templateUrl: './stake-input.component.html',
  styleUrls: ['./stake-input.component.scss'],
})
export class StakeInputComponent {
  @Input() formGroup!: FormGroup;
  @Input() maxAmount: number = 0;

  private trimmedMinValidator(control: AbstractControl) {
    const trimmedValue = Number(control.value.replace(/\D/g, ''));
    return trimmedValue > 10000000 ? null : { min: true };
  }

  onInputChange(event: any) {
    const value = event.target.value;
    this.validateAmount(event);
    event.target.value = this.formatNumberWithCommas(value.replace(/\D/g, ''));
  }

  validateAmount(event: any): void {
    const value = event.target.value;
    const amount = Number(value.replace(/\D/g, ''));
    if (!/^[0-9, ]*$/.test(value)) {
      this.formGroup.controls['amount'].setErrors({ pattern: true });
    }
    if (amount > this.maxAmount) {
      this.formGroup.controls['amount'].setErrors({ exceedsBalance: true });
    }
    this.formGroup.controls['amount'].setValidators([Validators.required, Validators.pattern(/^[0-9, ]*$/), this.trimmedMinValidator.bind(this)]);
    this.formGroup.controls['amount'].updateValueAndValidity();
  }

  formatNumberWithCommas(value: string): string {
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}
