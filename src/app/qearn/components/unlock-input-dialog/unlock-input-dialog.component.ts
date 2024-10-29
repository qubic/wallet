import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-unlock-input-dialog',
  templateUrl: './unlock-input-dialog.component.html',
  styleUrls: ['./unlock-input-dialog.component.scss']
})
export class UnlockInputDialogComponent {
  unlockForm: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<UnlockInputDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder
  ) {
    this.unlockForm = this.fb.group({
      amount: ['', Validators.required]
    });
  }

  get amountControl(): AbstractControl {
    return this.unlockForm.get('amount')!;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (this.unlockForm.valid) {
      const unlockAmount = Number(this.amountControl.value);
      this.dialogRef.close(unlockAmount);
    }
  }
}
