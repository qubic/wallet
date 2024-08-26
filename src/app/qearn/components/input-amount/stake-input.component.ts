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

  private trimmedMinValidator(control: AbstractControl) {
    const trimmedValue = Number(control.value.replace(/\D/g, ''));
    return trimmedValue > 10000000 ? null : { min: true };
  }

  private trimmedMaxValidator(control: AbstractControl) {
    const trimmedValue = Number(control.value.replace(/\D/g, ''));
    return trimmedValue > this.maxAmount ? { exceedsBalance: true } : null;
  }

  onInputChange(event: any) {
    const value = event?.target?.value || '0';
    event.target.value = this.formatNumberWithCommas(value.replace(/\D/g, ''));
    this.validateAmount(event);
  }

  validateAmount(event: any): void {
    const value = event?.target?.value || '0';
    const amount = Number(value.replace(/\D/g, ''));
    this.formGroup.controls['amount'].setValidators([Validators.required, Validators.pattern(/^[0-9, ]*$/), this.trimmedMinValidator.bind(this), this.trimmedMaxValidator.bind(this)]);
    this.formGroup.controls['amount'].updateValueAndValidity();
  }

  formatNumberWithCommas(value: string): string {
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log(changes);
    if (changes['maxAmount'] && changes['maxAmount'].currentValue !== changes['maxAmount'].previousValue) {
      this.validateAmount(null);
    }
  }
}