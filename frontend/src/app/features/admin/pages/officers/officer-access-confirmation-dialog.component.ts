import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface OfficerAccessConfirmationData {
  officerName: string;
  activate: boolean;
}

@Component({
  selector: 'app-officer-access-confirmation-dialog',
  standalone: true,
  imports: [MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.activate ? 'Activate' : 'Deactivate' }} officer access?</h2>
    <mat-dialog-content>
      <p>
        {{ data.activate ? 'Allow' : 'Prevent' }} <strong>{{ data.officerName }}</strong>
        from {{ data.activate ? 'signing in' : 'accessing CampusFlow' }}?
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button class="cancel" type="button" (click)="close(false)">Cancel</button>
      <button class="confirm" type="button" (click)="close(true)">
        {{ data.activate ? 'Activate account' : 'Deactivate account' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content p { color: var(--cf-text-secondary); font-size: 14px; line-height: 1.5; }
    mat-dialog-actions { gap: 8px; }
    button { min-height: 38px; padding: 0 13px; border-radius: 7px; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
    .cancel { border: 1px solid var(--cf-border); background: var(--cf-surface); color: var(--cf-text-primary); }
    .confirm { border: 1px solid var(--cf-danger); background: var(--cf-danger); color: white; }
  `],
})
export class OfficerAccessConfirmationDialog {
  readonly data = inject<OfficerAccessConfirmationData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<OfficerAccessConfirmationDialog, boolean>);

  close(confirmed: boolean): void {
    this.ref.close(confirmed);
  }
}
