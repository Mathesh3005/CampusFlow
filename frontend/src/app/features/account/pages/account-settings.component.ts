import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AccountService } from '../../../core/account/account.service';
import { AuthStateStore } from '../../../core/auth/auth-state.store';
import { ApiError } from '../../../core/http/api-error.handler';

@Component({
  selector: 'app-account-settings',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <section class="settings-page">
      <header class="page-heading">
        <div>
          <span class="eyebrow">ACCOUNT</span>
          <h1>Settings</h1>
          <p>Manage the credentials used to access your CampusFlow workspace.</p>
        </div>
      </header>

      <div class="settings-grid">
        <mat-card appearance="outlined" class="settings-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>lock_reset</mat-icon>
            <mat-card-title>Change password</mat-card-title>
            <mat-card-subtitle>Choose a new password with at least 8 characters.</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="submit()">
              @if (errorMessage()) {
                <p class="notice error" role="alert">{{ errorMessage() }}</p>
              }
              @if (successMessage()) {
                <p class="notice success" role="status">{{ successMessage() }}</p>
              }

              <mat-form-field appearance="outline">
                <mat-label>Current password</mat-label>
                <input matInput type="password" autocomplete="current-password" formControlName="currentPassword" />
                @if (form.controls.currentPassword.touched && form.controls.currentPassword.invalid) {
                  <mat-error>Enter your current password.</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>New password</mat-label>
                <input matInput type="password" autocomplete="new-password" formControlName="newPassword" />
                @if (form.controls.newPassword.touched && form.controls.newPassword.invalid) {
                  <mat-error>Use between 8 and 72 characters.</mat-error>
                }
                @if (form.controls.newPassword.touched && form.hasError('passwordUnchanged')) {
                  <mat-error>Choose a password different from your current password.</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Confirm new password</mat-label>
                <input matInput type="password" autocomplete="new-password" formControlName="confirmPassword" />
                @if (form.controls.confirmPassword.touched && form.hasError('passwordMismatch')) {
                  <mat-error>Passwords do not match.</mat-error>
                }
              </mat-form-field>

              <button mat-flat-button color="primary" type="submit" [disabled]="submitting()">
                {{ submitting() ? 'Updating…' : 'Update password' }}
              </button>
            </form>
          </mat-card-content>
        </mat-card>

        <mat-card appearance="outlined" class="settings-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>account_circle</mat-icon>
            <mat-card-title>Signed-in account</mat-card-title>
            <mat-card-subtitle>This session ends when you close the browser tab.</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <dl class="account-details">
              <div>
                <dt>Email</dt>
                <dd>{{ user()?.email }}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{{ user()?.role }}</dd>
              </div>
              <div>
                <dt>Session expires</dt>
                <dd>{{ user()?.expiresAt | date: 'medium' }}</dd>
              </div>
            </dl>
          </mat-card-content>
        </mat-card>

        <mat-card appearance="outlined" class="settings-card help-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>support_agent</mat-icon>
            <mat-card-title>Need account recovery?</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>
              If you cannot sign in or need your account reset, contact the campus placement office.
              CampusFlow does not send password-reset emails.
            </p>
          </mat-card-content>
        </mat-card>
      </div>
    </section>
  `,
  styleUrl: './account-settings.component.scss',
})
export class AccountSettingsComponent {
  private readonly fb = new FormBuilder();
  private readonly account = inject(AccountService);
  private readonly auth = inject(AuthStateStore);

  readonly user = this.auth.user;
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordsMatch });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    const { currentPassword, newPassword } = this.form.getRawValue();
    this.account.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.successMessage.set('Password updated. Use the new password the next time you sign in.');
        this.form.reset();
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(error instanceof ApiError ? error.message : 'Unable to update your password.');
      },
    });
  }
}

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const currentPassword = control.get('currentPassword')?.value;
  const password = control.get('newPassword')?.value;
  const confirmation = control.get('confirmPassword')?.value;
  if (currentPassword && password && currentPassword === password) return { passwordUnchanged: true };
  return password && confirmation && password !== confirmation ? { passwordMismatch: true } : null;
}
