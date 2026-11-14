import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, catchError, map, merge, of, switchMap } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { EmploymentType, JobRequest, JobResponse, JobStatus, WorkMode } from '../../../../core/models/domain.models';
import { OfficerJobsService } from '../../services/officer-jobs.service';

type JobLoadState = 'ready' | 'loading' | 'invalid' | 'notFound' | 'closed' | 'error';

type JobLoadResult =
  | { type: 'create' }
  | { type: 'invalid' }
  | { type: 'loaded'; id: number; job: JobResponse }
  | { type: 'closed'; id: number }
  | { type: 'notFound' }
  | { type: 'error'; message: string };

@Component({
  selector: 'app-officer-job-create',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './job-create.component.html',
  styleUrl: './job-create.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfficerJobCreate implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly jobs = inject(OfficerJobsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly retryRequests = new Subject<string | null>();

  readonly loadState = signal<JobLoadState>('ready');
  readonly isEditMode = signal(false);
  readonly loadedJobId = signal<number | null>(null);
  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly loadErrorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly employmentTypes = [EmploymentType.FullTime, EmploymentType.Internship];
  readonly workModes = [WorkMode.Onsite, WorkMode.Remote, WorkMode.Hybrid];

  readonly form = new FormGroup({
    jobTitle: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, nonBlankValidator, Validators.maxLength(150)],
    }),
    companyName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, nonBlankValidator, Validators.maxLength(150)],
    }),
    jobDescription: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, nonBlankValidator],
    }),
    location: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(150)],
    }),
    employmentType: new FormControl<EmploymentType | null>(null, Validators.required),
    workMode: new FormControl<WorkMode | null>(null, Validators.required),
    salaryMin: new FormControl<number | null>(null, Validators.min(0)),
    salaryMax: new FormControl<number | null>(null, Validators.min(0)),
    minimumCgpa: new FormControl<number | null>(null, [Validators.min(0), Validators.max(10)]),
    applicationDeadline: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, futureDateValidator],
    }),
  }, { validators: salaryRangeValidator });

  ngOnInit(): void {
    merge(
      this.route.paramMap.pipe(map(params => params.get('id'))),
      this.retryRequests,
    ).pipe(
      switchMap(id => this.loadRoute(id)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(result => this.applyLoadResult(result));
  }

  shouldShowError(control: { invalid: boolean; touched: boolean }): boolean {
    return control.invalid && (control.touched || this.submitted());
  }

  cancelLink(): string | (string | number)[] {
    const id = this.loadedJobId();
    return this.isEditMode() && id !== null ? ['/officer/jobs', id] : '/officer/jobs';
  }

  retryLoad(): void {
    this.retryRequests.next(this.route.snapshot.paramMap.get('id'));
  }

  onSubmit(): void {
    if (this.submitting() || this.loadState() !== 'ready') return;
    const id = this.loadedJobId();
    if (this.isEditMode() && id === null) return;

    this.submitted.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();
    if (values.employmentType === null || values.workMode === null) return;

    const request: JobRequest = {
      jobTitle: values.jobTitle.trim(),
      companyName: values.companyName.trim(),
      jobDescription: values.jobDescription.trim(),
      location: values.location.trim() || null,
      employmentType: values.employmentType,
      workMode: values.workMode,
      salaryMin: values.salaryMin,
      salaryMax: values.salaryMax,
      minimumCgpa: values.minimumCgpa,
      applicationDeadline: new Date(values.applicationDeadline).toISOString(),
    };

    this.submitting.set(true);
    const saveRequest = id === null
      ? this.jobs.createJob(request)
      : this.jobs.updateJob(id, request);
    saveRequest.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: createdJob => {
        this.submitting.set(false);
        this.successMessage.set(this.isEditMode() ? 'Job updated successfully.' : 'Draft saved successfully.');
        void this.router.navigateByUrl(`/officer/jobs/${createdJob.id}`);
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(error instanceof ApiError
          ? error.message
          : this.isEditMode()
            ? 'The job changes could not be saved. Please try again.'
            : 'The job draft could not be saved. Please try again.');
      },
    });
  }

  private loadRoute(idValue: string | null): Observable<JobLoadResult> {
    this.loadedJobId.set(null);
    this.submitted.set(false);
    this.errorMessage.set(null);
    this.loadErrorMessage.set(null);
    this.successMessage.set(null);
    this.resetForm();

    if (idValue === null) {
      this.isEditMode.set(false);
      this.loadState.set('ready');
      return of({ type: 'create' });
    }

    this.isEditMode.set(true);
    this.loadState.set('loading');
    if (!/^[0-9]+$/.test(idValue)) return of({ type: 'invalid' });

    const id = Number(idValue);
    if (!Number.isSafeInteger(id) || id <= 0) return of({ type: 'invalid' });

    return this.jobs.getJobById(id).pipe(
      map(job => job.status === JobStatus.Closed
        ? { type: 'closed' as const, id }
        : { type: 'loaded' as const, id, job }),
      catchError((error: unknown) => of(error instanceof ApiError && error.status === 404
        ? { type: 'notFound' as const }
        : {
          type: 'error' as const,
          message: error instanceof ApiError
            ? error.message
            : 'Job details could not be loaded. Please try again.',
        })),
    );
  }

  private applyLoadResult(result: JobLoadResult): void {
    switch (result.type) {
      case 'create':
        this.loadState.set('ready');
        break;
      case 'invalid':
        this.loadState.set('invalid');
        break;
      case 'loaded':
        this.loadedJobId.set(result.id);
        this.populateForm(result.job);
        this.loadState.set('ready');
        break;
      case 'closed':
        this.loadedJobId.set(result.id);
        this.loadState.set('closed');
        break;
      case 'notFound':
        this.loadState.set('notFound');
        break;
      case 'error':
        this.loadErrorMessage.set(result.message);
        this.loadState.set('error');
        break;
    }
  }

  private populateForm(job: JobResponse): void {
    this.form.reset({
      jobTitle: job.jobTitle,
      companyName: job.companyName,
      jobDescription: job.jobDescription,
      location: job.location ?? '',
      employmentType: job.employmentType,
      workMode: job.workMode,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      minimumCgpa: job.minimumCgpa,
      applicationDeadline: this.toLocalDateTime(job.applicationDeadline),
    });
  }

  private resetForm(): void {
    this.form.reset({
      jobTitle: '',
      companyName: '',
      jobDescription: '',
      location: '',
      employmentType: null,
      workMode: null,
      salaryMin: null,
      salaryMax: null,
      minimumCgpa: null,
      applicationDeadline: '',
    });
  }

  private toLocalDateTime(value: string): string {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 16);
  }
}

function nonBlankValidator(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'string' && control.value.trim().length === 0
    ? { required: true }
    : null;
}

function futureDateValidator(control: AbstractControl): ValidationErrors | null {
  if (typeof control.value !== 'string' || control.value.length === 0) return null;
  const timestamp = new Date(control.value).getTime();
  return Number.isFinite(timestamp) && timestamp > Date.now() ? null : { future: true };
}

function salaryRangeValidator(control: AbstractControl): ValidationErrors | null {
  const minimum = control.get('salaryMin')?.value;
  const maximum = control.get('salaryMax')?.value;
  return typeof minimum === 'number' && typeof maximum === 'number' && maximum < minimum
    ? { salaryRange: true }
    : null;
}
