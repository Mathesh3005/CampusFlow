import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, catchError, filter, finalize, map, merge, of, switchMap } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { JobResponse, JobStatus } from '../../../../core/models/domain.models';
import { OfficerJobsService } from '../../services/officer-jobs.service';
import { JobStatusConfirmationDialog } from './job-status-confirmation-dialog.component';
import { JobDeleteConfirmationDialog } from './job-delete-confirmation-dialog.component';
import { JobStatusAction, jobDeleteErrorMessage, jobStatusActionErrorMessage } from './job-status-actions';

type JobDetailsState =
  | { status: 'loading' }
  | { status: 'ready'; job: JobResponse }
  | { status: 'invalid' }
  | { status: 'notFound' }
  | { status: 'error'; message: string };

@Component({
  selector: 'app-officer-job-details',
  standalone: true,
  imports: [DatePipe, DecimalPipe, MatDialogModule, RouterLink],
  templateUrl: './job-details.component.html',
  styleUrl: './job-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfficerJobDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(OfficerJobsService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly retryRequests = new Subject<string | null>();

  readonly state = signal<JobDetailsState>({ status: 'loading' });
  readonly actionPending = signal(false);
  readonly deletePending = signal(false);
  readonly actionError = signal<string | null>(null);
  readonly actionSuccess = signal<string | null>(null);

  ngOnInit(): void {
    merge(
      this.route.paramMap.pipe(map(params => params.get('id'))),
      this.retryRequests,
    ).pipe(
      switchMap(id => this.loadJob(id)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(state => this.state.set(state));
  }

  retry(): void {
    this.retryRequests.next(this.route.snapshot.paramMap.get('id'));
  }

  canPublish(job: JobResponse): boolean {
    return job.status === JobStatus.Draft;
  }

  canClose(job: JobResponse): boolean {
    return job.status === JobStatus.Published;
  }

  canDelete(job: JobResponse): boolean {
    return job.status === JobStatus.Draft;
  }

  confirmStatusAction(job: JobResponse, action: JobStatusAction): void {
    if (this.actionPending() || this.deletePending() || !this.canPerformAction(job, action)) return;

    this.dialog.open(JobStatusConfirmationDialog, {
      data: { action, jobTitle: job.jobTitle, companyName: job.companyName },
      role: 'alertdialog',
    }).afterClosed().pipe(
      filter(confirmed => confirmed === true),
      switchMap(() => {
        const latestJob = this.currentJob();
        if (this.actionPending() || this.deletePending()
          || !latestJob || latestJob.id !== job.id || !this.canPerformAction(latestJob, action)) {
          return EMPTY;
        }

        this.actionPending.set(true);
        this.actionError.set(null);
        this.actionSuccess.set(null);
        const request = action === 'publish'
          ? this.service.publishJob(job.id)
          : this.service.closeJob(job.id);

        return request.pipe(
          map(updated => ({ updated })),
          catchError((error: unknown) => {
            this.actionError.set(jobStatusActionErrorMessage(error, action));
            if (error instanceof ApiError && (error.status === 404 || error.status === 409)) this.retry();
            return EMPTY;
          }),
          finalize(() => this.actionPending.set(false)),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ updated }) => {
      this.state.set({ status: 'ready', job: updated });
      this.actionSuccess.set(action === 'publish' ? 'Job published successfully.' : 'Job closed successfully.');
    });
  }

  confirmDelete(job: JobResponse): void {
    if (this.actionPending() || this.deletePending() || !this.canDelete(job)) return;

    this.dialog.open(JobDeleteConfirmationDialog, {
      data: { jobTitle: job.jobTitle, companyName: job.companyName },
      role: 'alertdialog',
    }).afterClosed().pipe(
      filter(confirmed => confirmed === true),
      switchMap(() => {
        const latestJob = this.currentJob();
        if (this.actionPending() || this.deletePending()
          || !latestJob || latestJob.id !== job.id || !this.canDelete(latestJob)) return EMPTY;

        this.deletePending.set(true);
        this.actionError.set(null);
        this.actionSuccess.set(null);
        return this.service.deleteJob(job.id).pipe(
          catchError((error: unknown) => {
            this.actionError.set(jobDeleteErrorMessage(error));
            if (error instanceof ApiError && (error.status === 404 || error.status === 409)) this.retry();
            return EMPTY;
          }),
          finalize(() => this.deletePending.set(false)),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      void this.router.navigateByUrl('/officer/jobs');
    });
  }

  private currentJob(): JobResponse | null {
    const current = this.state();
    return current.status === 'ready' ? current.job : null;
  }

  private canPerformAction(job: JobResponse, action: JobStatusAction): boolean {
    return action === 'publish' ? this.canPublish(job) : this.canClose(job);
  }

  private loadJob(idValue: string | null): Observable<JobDetailsState> {
    if (idValue === null || !/^[0-9]+$/.test(idValue)) {
      return of({ status: 'invalid' });
    }

    const id = Number(idValue);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return of({ status: 'invalid' });
    }

    this.state.set({ status: 'loading' });
    return this.service.getJobById(id).pipe(
      map(job => ({ status: 'ready' as const, job })),
      catchError((error: unknown) => of(error instanceof ApiError && error.status === 404
        ? { status: 'notFound' as const }
        : { status: 'error' as const, message: this.errorMessage(error) })),
    );
  }

  private errorMessage(error: unknown): string {
    return error instanceof ApiError ? error.message : 'Job details could not be loaded. Please try again.';
  }
}
