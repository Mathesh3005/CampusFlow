import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, catchError, filter, finalize, map, merge, of, switchMap } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { InterviewMode, InterviewRequest, InterviewResponse, InterviewStatus, InterviewUpdateRequest } from '../../../../core/models/domain.models';
import { OfficerInterviewsService } from '../../services/officer-interviews.service';
import { InterviewConfirmationDialog } from './interview-confirmation-dialog.component';

type InterviewFormState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'invalid' }
  | { status: 'notFound' }
  | { status: 'notEditable'; interview: InterviewResponse }
  | { status: 'error'; message: string };

type InterviewFormLoadResult =
  | { type: 'create' }
  | { type: 'invalid' }
  | { type: 'loaded'; id: number; interview: InterviewResponse }
  | { type: 'notFound' }
  | { type: 'error'; message: string };

@Component({
  selector: 'app-officer-interview-form',
  standalone: true,
  imports: [MatDialogModule, ReactiveFormsModule, RouterLink],
  templateUrl: './interview-form.component.html',
  styleUrl: './interview-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfficerInterviewForm implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(OfficerInterviewsService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly retryRequests = new Subject<string | null>();

  readonly state = signal<InterviewFormState>({ status: 'loading' });
  readonly isEditMode = signal(false);
  readonly loadedInterviewId = signal<number | null>(null);
  readonly savedInterviewId = signal<number | null>(null);
  readonly interviewModes = [InterviewMode.Online, InterviewMode.Offline];
  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly errorCanRefresh = signal(false);

  readonly form = new FormGroup({
    applicationId: new FormControl<number | null>(null, [Validators.required, positiveSafeIntegerValidator]),
    scheduledAt: new FormControl('', { nonNullable: true, validators: [Validators.required, futureDateValidator] }),
    interviewMode: new FormControl<InterviewMode | null>(null, Validators.required),
    locationOrLink: new FormControl('', { nonNullable: true, validators: [Validators.required, nonBlankValidator, Validators.maxLength(500)] }),
    notes: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    merge(
      this.route.paramMap.pipe(map(params => params.get('id'))),
      this.retryRequests,
    ).pipe(
      switchMap(id => this.loadRoute(id)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(result => this.applyLoadResult(result));
  }

  shouldShowError(control: AbstractControl): boolean {
    return control.invalid && (control.touched || this.submitted());
  }

  cancelLink(): string {
    const id = this.loadedInterviewId();
    return this.isEditMode() && id !== null ? `/officer/interviews/${id}` : '/officer/interviews';
  }

  retryLoad(): void {
    this.retryRequests.next(this.route.snapshot.paramMap.get('id'));
  }

  onSubmit(): void {
    if (this.submitting() || this.state().status !== 'ready') return;
    const editing = this.isEditMode();
    const id = this.loadedInterviewId();
    if (editing && id === null) return;

    this.submitted.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.errorCanRefresh.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();
    if (values.scheduledAt === '' || values.interviewMode === null) return;
    if (this.isEditMode() && id === null) return;

    const scheduledAt = this.toIsoDateTime(values.scheduledAt);
    if (scheduledAt === null || Date.parse(scheduledAt) <= Date.now()) {
      this.form.controls.scheduledAt.setErrors({ future: true });
      this.form.controls.scheduledAt.markAsTouched();
      return;
    }

    const notes = values.notes.trim() || null;
    const updateRequest: InterviewUpdateRequest = {
      scheduledAt,
      interviewMode: values.interviewMode,
      locationOrLink: values.locationOrLink.trim(),
      notes,
    };
    const createRequest: InterviewRequest | null = editing || values.applicationId === null
      ? null
      : {
        applicationId: values.applicationId,
        ...updateRequest,
      };

    this.dialog.open(InterviewConfirmationDialog, {
      data: {
        title: editing ? 'Save interview changes?' : 'Schedule this interview?',
        message: editing
          ? `Save the updated schedule for interview #${id}?`
          : `Schedule an interview for application #${values.applicationId}?`,
        confirmLabel: editing ? 'Save changes' : 'Schedule interview',
      },
      role: 'alertdialog',
    }).afterClosed().pipe(
      filter(confirmed => confirmed === true),
      switchMap(() => {
        const latestState = this.state();
        if (this.submitting() || latestState.status !== 'ready'
          || (editing && (id === null || this.loadedInterviewId() !== id))
          || (!editing && createRequest === null)) {
          return EMPTY;
        }

        const currentDate = this.toIsoDateTime(this.form.controls.scheduledAt.value);
        if (currentDate === null || Date.parse(currentDate) <= Date.now()) {
          this.form.controls.scheduledAt.setErrors({ future: true });
          this.form.controls.scheduledAt.markAsTouched();
          return EMPTY;
        }

        this.submitting.set(true);
        const request = editing
          ? id === null
            ? EMPTY
            : this.service.updateInterview(id, { ...updateRequest, scheduledAt: currentDate })
          : createRequest === null
            ? EMPTY
            : this.service.scheduleInterview({ ...createRequest, scheduledAt: currentDate });
        return request.pipe(
          catchError((error: unknown) => {
            this.errorMessage.set(this.apiErrorMessage(error, editing));
            this.errorCanRefresh.set(editing && error instanceof ApiError
              && (error.status === 404 || error.status === 409));
            return EMPTY;
          }),
          finalize(() => this.submitting.set(false)),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(interview => {
      this.savedInterviewId.set(interview.id);
      if (editing) {
        this.loadedInterviewId.set(interview.id);
        this.form.patchValue({
          applicationId: interview.applicationId,
          scheduledAt: this.toLocalDateTime(interview.scheduledAt),
          interviewMode: interview.interviewMode,
          locationOrLink: interview.locationOrLink,
          notes: interview.notes ?? '',
        });
      }
      this.successMessage.set(editing
        ? 'Interview saved successfully.'
        : 'Interview scheduled successfully.');
    });
  }

  private loadRoute(idValue: string | null): Observable<InterviewFormLoadResult> {
    this.loadedInterviewId.set(null);
    this.savedInterviewId.set(null);
    this.submitted.set(false);
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.errorCanRefresh.set(false);
    this.resetForm();

    if (idValue === null) {
      this.isEditMode.set(false);
      this.state.set({ status: 'ready' });
      return of({ type: 'create' });
    }

    this.isEditMode.set(true);
    this.state.set({ status: 'loading' });
    if (!/^[0-9]+$/.test(idValue)) return of({ type: 'invalid' });
    const id = Number(idValue);
    if (!Number.isSafeInteger(id) || id <= 0) return of({ type: 'invalid' });

    return this.service.getInterviewById(id).pipe(
      map(interview => ({ type: 'loaded' as const, id, interview })),
      catchError((error: unknown) => of(error instanceof ApiError && error.status === 404
        ? { type: 'notFound' as const }
        : {
          type: 'error' as const,
          message: error instanceof ApiError && error.status === 401
            ? 'Your session has expired. Sign in again to edit interviews.'
            : error instanceof ApiError && error.status === 403
              ? 'You do not have permission to edit this interview.'
              : 'Interview details could not be loaded. Please try again.',
        })),
    );
  }

  private applyLoadResult(result: InterviewFormLoadResult): void {
    switch (result.type) {
      case 'create':
        this.state.set({ status: 'ready' });
        break;
      case 'invalid':
        this.state.set({ status: 'invalid' });
        break;
      case 'loaded':
        this.loadedInterviewId.set(result.id);
        if (result.interview.status !== InterviewStatus.Scheduled) {
          this.state.set({ status: 'notEditable', interview: result.interview });
          break;
        }
        this.form.patchValue({
          applicationId: result.interview.applicationId,
          scheduledAt: this.toLocalDateTime(result.interview.scheduledAt),
          interviewMode: result.interview.interviewMode,
          locationOrLink: result.interview.locationOrLink,
          notes: result.interview.notes ?? '',
        });
        this.state.set({ status: 'ready' });
        break;
      case 'notFound':
        this.state.set({ status: 'notFound' });
        break;
      case 'error':
        this.state.set({ status: 'error', message: result.message });
        break;
    }
  }

  private resetForm(): void {
    this.form.reset({
      applicationId: null,
      scheduledAt: '',
      interviewMode: null,
      locationOrLink: '',
      notes: '',
    });
  }

  private toIsoDateTime(value: string): string | null {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }

  private toLocalDateTime(value: string): string {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 16);
  }

  private apiErrorMessage(error: unknown, editing: boolean): string {
    if (!(error instanceof ApiError)) return 'The interview could not be saved. Please try again.';
    if (error.status === 400) return 'The interview details are invalid. Check the date, mode, and location or meeting link.';
    if (error.status === 401) return 'Your session has expired. Sign in again to manage interviews.';
    if (error.status === 403) return 'You do not have permission to manage this interview or application.';
    if (error.status === 404) return 'The interview or application could not be found.';
    if (error.status === 409) {
      return editing
        ? 'This interview may no longer be scheduled and cannot be changed.'
        : 'Only applications with SHORTLISTED status can be scheduled for an interview.';
    }
    if (error.status >= 500) return 'The server could not save the interview. Please try again.';
    return 'The interview could not be saved. Please try again.';
  }
}

function positiveSafeIntegerValidator(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'number' && Number.isSafeInteger(control.value) && control.value > 0
    ? null
    : { positiveInteger: true };
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
