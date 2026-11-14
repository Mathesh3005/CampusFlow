import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { ApplicationRequest, ApplicationResponse, JobResponse } from '../../../../core/models/domain.models';
import { StudentResume } from '../../models/student-resume.model';
import { StudentApplicationsService } from '../../services/student-applications.service';
import { StudentResumesService } from '../../services/student-resumes.service';
import { StudentJobsService } from '../../services/student-jobs.service';

type JobDetailsState =
  | { status: 'loading' }
  | { status: 'ready'; job: JobResponse }
  | { status: 'invalid' }
  | { status: 'notFound' }
  | { status: 'error'; message: string };

type ResumeListState =
  | { status: 'loading' }
  | { status: 'ready'; resumes: StudentResume[] }
  | { status: 'error' };

@Component({
  selector: 'app-student-job-details',
  standalone: true,
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './job-details.component.html',
  styleUrl: './job-details.component.scss',
})
export class StudentJobDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(StudentJobsService);
  private readonly resumesService = inject(StudentResumesService);
  private readonly applicationsService = inject(StudentApplicationsService);
  private readonly destroyRef = inject(DestroyRef);
  readonly state = signal<JobDetailsState>({ status: 'loading' });
  readonly resumesState = signal<ResumeListState>({ status: 'loading' });
  readonly selectedResumeId = signal<number | null>(null);
  readonly coverLetter = new FormControl('', { nonNullable: true });
  readonly submitting = signal(false);
  readonly submissionError = signal<string | null>(null);
  readonly submittedApplication = signal<ApplicationResponse | null>(null);
  private submissionSequence = 0;

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        this.resetApplicationState();
        const idValue = params.get('id');
        if (idValue === null || !/^[0-9]+$/.test(idValue)) return of({ status: 'invalid' as const });
        const id = Number(idValue);
        if (!Number.isSafeInteger(id) || id <= 0) return of({ status: 'invalid' as const });
        this.state.set({ status: 'loading' });
        return this.service.getJob(id).pipe(
          tap(() => this.loadResumes()),
          map(job => ({ status: 'ready' as const, job })),
          catchError((error: unknown) => of(error instanceof ApiError && error.status === 404
            ? { status: 'notFound' as const }
            : { status: 'error' as const, message: error instanceof Error ? error.message : 'Job details could not be loaded.' })),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(state => this.state.set(state));
  }

  selectResume(resumeId: number): void {
    const current = this.resumesState();
    if (current.status !== 'ready' || !current.resumes.some(resume => resume.id === resumeId && resume.isActive)) return;
    this.selectedResumeId.set(resumeId);
  }

  submitApplication(job: JobResponse): void {
    if (this.submitting() || this.submittedApplication()) return;

    const coverLetter = this.coverLetter.value.trim();
    const resumeId = this.selectedResumeId();
    const request: ApplicationRequest = {
      jobId: job.id,
      ...(resumeId === null ? {} : { resumeId }),
      ...(coverLetter ? { coverLetter } : {}),
    };
    const sequence = ++this.submissionSequence;
    this.submitting.set(true);
    this.submissionError.set(null);

    this.applicationsService.submitApplication(request).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: application => {
        if (sequence !== this.submissionSequence) return;
        this.submitting.set(false);
        this.submittedApplication.set(application);
      },
      error: (error: unknown) => {
        if (sequence !== this.submissionSequence) return;
        this.submitting.set(false);
        this.submissionError.set(this.applicationErrorMessage(error));
      },
    });
  }

  private loadResumes(): void {
    this.resumesState.set({ status: 'loading' });
    this.resumesService.listResumes().pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: resumes => this.resumesState.set({ status: 'ready', resumes }),
      error: () => this.resumesState.set({ status: 'error' }),
    });
  }

  private resetApplicationState(): void {
    this.submissionSequence++;
    this.resumesState.set({ status: 'loading' });
    this.selectedResumeId.set(null);
    this.coverLetter.setValue('', { emitEvent: false });
    this.submitting.set(false);
    this.submissionError.set(null);
    this.submittedApplication.set(null);
  }

  private applicationErrorMessage(error: unknown): string {
    if (!(error instanceof ApiError)) return 'The application could not be submitted. Please try again.';
    const detail = error.problem?.detail?.toLowerCase() ?? '';
    switch (error.status) {
      case 400: return 'The application details were invalid. Review the form and try again.';
      case 401: return 'Your session has expired. Sign in again to apply.';
      case 403: return 'The backend could not approve this application based on eligibility or account access.';
      case 404: return 'The job or selected resume is no longer available. Refresh and try again.';
      case 409:
        if (detail.includes('already applied')) return 'You have already applied for this job.';
        if (detail.includes('deadline has passed')) return 'The application deadline has passed. This job can no longer accept applications.';
        if (detail.includes('not open for applications')) return 'This job is no longer open for applications.';
        return 'This application conflicts with the job’s current status. Refresh the job details and try again.';
      case 500: return 'The server could not submit your application. Please try again later.';
      default: return 'The application could not be submitted. Please try again.';
    }
  }
}
