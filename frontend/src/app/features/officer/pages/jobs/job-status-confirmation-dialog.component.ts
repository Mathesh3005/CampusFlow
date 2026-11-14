import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { JobStatusAction } from './job-status-actions';

export interface JobStatusConfirmationData {
  action: JobStatusAction;
  jobTitle: string;
  companyName: string;
}

@Component({
  selector: 'app-job-status-confirmation-dialog',
  standalone: true,
  imports: [MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.action === 'publish' ? 'Publish this job?' : 'Close this job?' }}</h2>
    <mat-dialog-content>
      <p>
        Are you sure you want to {{ data.action }} <strong>{{ data.jobTitle }}</strong>
        at {{ data.companyName }}?
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button class="dialog-cancel" type="button" (click)="cancel()">Cancel</button>
      <button
        class="dialog-confirm"
        [class.close-action]="data.action === 'close'"
        type="button"
        (click)="confirm()">
        {{ data.action === 'publish' ? 'Publish job' : 'Close job' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content p { color: #475569; font-size: 14px; line-height: 1.5; }
    mat-dialog-actions { gap: 8px; }
    .dialog-cancel, .dialog-confirm { min-height: 38px; padding: 0 13px; border-radius: 7px; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
    .dialog-cancel { border: 1px solid #cbd5e1; background: #fff; color: #334155; }
    .dialog-confirm { border: 1px solid #2563eb; background: #2563eb; color: #fff; }
    .dialog-confirm.close-action { border-color: #b91c1c; background: #b91c1c; }
  `],
})
export class JobStatusConfirmationDialog {
  readonly data = inject<JobStatusConfirmationData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<JobStatusConfirmationDialog, boolean>);

  cancel(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }
}
