import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { ApiError } from '../../../../core/http/api-error.handler';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly form = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    registerNumber: ['', [Validators.required, Validators.maxLength(30)]],
    department: ['', [Validators.required, Validators.maxLength(100)]],
    graduationYear: [new Date().getFullYear(), [Validators.required, Validators.min(2020), Validators.max(2040)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    confirmPassword: ['', Validators.required],
  }, { validators: RegisterComponent.passwordsMatch });

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.submitting.set(true);
    this.errorMessage.set(null);
    this.auth.registerStudent({
      fullName: value.fullName.trim(),
      email: value.email.trim(),
      registerNumber: value.registerNumber.trim(),
      department: value.department.trim(),
      graduationYear: Number(value.graduationYear),
      password: value.password,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        void this.router.navigateByUrl('/student/dashboard');
      },
      error: (error: unknown) => {
        this.errorMessage.set(error instanceof ApiError && error.message
          ? error.message
          : 'We could not create your account. Check your details and try again.');
        this.submitting.set(false);
      },
    });
  }

  private static passwordsMatch(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmation = control.get('confirmPassword')?.value;
    return password === confirmation ? null : { passwordsMismatch: true };
  }
}
