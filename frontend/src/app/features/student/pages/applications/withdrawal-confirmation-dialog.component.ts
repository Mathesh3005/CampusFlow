import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface WithdrawalConfirmationData {
  jobTitle: string;
  companyName: string;
}

@Component({
  selector: 'app-withdrawal-confirmation-dialog',
  standalone: true,
  imports: [MatDialogModule],
  template: `
    <h2 mat-dialog-title>Withdraw application?</h2>
    <mat-dialog-content>
      <p>Are you sure you want to withdraw your application for <strong>{{ data.jobTitle }}</strong> at {{ data.companyName }}?</p>
      <p>This action cannot be undone.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button class="dialog-cancel" type="button" (click)="cancel()">Keep application</button>
      <button class="dialog-confirm" type="button" (click)="confirm()">Withdraw application</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content p { color: #475569; font-size: 14px; line-height: 1.5; }
    mat-dialog-actions { gap: 8px; }
    .dialog-cancel, .dialog-confirm { min-height: 38px; padding: 0 13px; border-radius: 7px; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
    .dialog-cancel { border: 1px solid #cbd5e1; background: #fff; color: #334155; }
    .dialog-confirm { border: 1px solid #b91c1c; background: #b91c1c; color: #fff; }
  `],
})
export class WithdrawalConfirmationDialog {
  readonly data = inject<WithdrawalConfirmationData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<WithdrawalConfirmationDialog, boolean>);

  cancel(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }
}
