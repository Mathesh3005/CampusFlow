import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface InterviewConfirmationData {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
}

@Component({
  selector: 'app-interview-confirmation-dialog',
  standalone: true,
  imports: [MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content><p>{{ data.message }}</p></mat-dialog-content>
    <mat-dialog-actions align="end">
      <button class="dialog-cancel" type="button" (click)="cancel()">Cancel</button>
      <button class="dialog-confirm" [class.destructive]="data.destructive" type="button" (click)="confirm()">
        {{ data.confirmLabel }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content p { color: #475569; font-size: 14px; line-height: 1.5; }
    mat-dialog-actions { gap: 8px; }
    .dialog-cancel, .dialog-confirm { min-height: 38px; padding: 0 13px; border-radius: 7px; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
    .dialog-cancel { border: 1px solid #cbd5e1; background: #fff; color: #334155; }
    .dialog-confirm { border: 1px solid #2563eb; background: #2563eb; color: #fff; }
    .dialog-confirm.destructive { border-color: #b91c1c; background: #b91c1c; }
  `],
})
export class InterviewConfirmationDialog {
  readonly data = inject<InterviewConfirmationData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<InterviewConfirmationDialog, boolean>);

  cancel(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }
}
