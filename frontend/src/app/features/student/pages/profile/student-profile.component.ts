import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '../../../../core/http/api-error.handler';
import { StudentProfile, StudentProfileUpdate } from '../../models/student-profile.model';
import { StudentProfileService } from '../../services/student-profile.service';

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './student-profile.component.html',
  styleUrl: './student-profile.component.scss',
})
export class StudentProfileComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly profiles = inject(StudentProfileService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly profile = signal<StudentProfile | null>(null);
  readonly form = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(150)]],
    department: ['', [Validators.required, Validators.maxLength(100)]],
    graduationYear: [new Date().getFullYear(), [Validators.required, Validators.min(2020), Validators.max(2040)]],
    cgpa: ['', [Validators.min(0), Validators.max(10)]],
    phone: ['', Validators.maxLength(15)],
  });

  ngOnInit(): void { this.loadProfile(); }

  loadProfile(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.profiles.getProfile().subscribe({
      next: profile => {
        this.profile.set(profile);
        this.form.patchValue({
          fullName: profile.fullName,
          department: profile.department,
          graduationYear: profile.graduationYear,
          cgpa: profile.cgpa === null ? '' : String(profile.cgpa),
          phone: profile.phone ?? '',
        });
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.describeError(error, 'Could not load your profile. Please try again.'));
        this.loading.set(false);
      },
    });
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const update: StudentProfileUpdate = {
      fullName: value.fullName.trim(),
      department: value.department.trim(),
      graduationYear: Number(value.graduationYear),
      cgpa: value.cgpa.trim() ? Number(value.cgpa) : null,
      phone: value.phone.trim() || null,
    };
    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.profiles.updateProfile(update).subscribe({
      next: profile => {
        this.profile.set(profile);
        this.form.markAsPristine();
        this.successMessage.set('Your profile has been saved.');
        this.saving.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.describeError(error, 'Could not save your profile. Please try again.'));
        this.saving.set(false);
      },
    });
  }

  private describeError(error: unknown, fallback: string): string {
    return error instanceof ApiError && error.message ? error.message : fallback;
  }
}
