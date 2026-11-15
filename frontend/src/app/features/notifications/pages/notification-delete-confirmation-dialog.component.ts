import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface NotificationDeleteConfirmationData {
  title: string;
}

@Component({
  selector: 'app-notification-delete-confirmation-dialog',
  standalone: true,
  imports: [MatDialogModule],
  template: `
    <h2 mat-dialog-title>Delete notification?</h2>
    <mat-dialog-content>
      <p>“{{ data.title }}” will be permanently deleted.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button class="dialog-cancel" type="button" (click)="dialogRef.close(false)">Keep notification</button>
      <button class="dialog-confirm" type="button" (click)="dialogRef.close(true)">Delete</button>
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
export class NotificationDeleteConfirmationDialog {
  readonly data = inject<NotificationDeleteConfirmationData>(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<NotificationDeleteConfirmationDialog, boolean>);
}
