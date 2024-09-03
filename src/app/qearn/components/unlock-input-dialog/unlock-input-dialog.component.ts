import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup } from '@angular/forms';

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
      amount: ['']
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (this.unlockForm.valid) {
      const unlockAmount = Number(this.unlockForm.controls['amount'].value.replace(/\D/g, ''));
      this.dialogRef.close(unlockAmount);
    }
  }
}
