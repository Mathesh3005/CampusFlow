import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, filter, finalize, map, of, switchMap } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { JobResponse, JobStatus, PageResponse } from '../../../../core/models/domain.models';
import {
  OFFICER_JOBS_DEFAULT_SORT,
  OFFICER_JOBS_PAGE_SIZE,
  OfficerJobsQuery,
  OfficerJobsService,
} from '../../services/officer-jobs.service';
import { JobStatusConfirmationDialog } from './job-status-confirmation-dialog.component';
import { JobDeleteConfirmationDialog } from './job-delete-confirmation-dialog.component';
import { JobStatusAction, jobDeleteErrorMessage, jobStatusActionErrorMessage } from './job-status-actions';

type JobsListState =
  | { status: 'loading' }
  | { status: 'ready'; page: PageResponse<JobResponse> }
  | { status: 'error'; message: string };

@Component({
  selector: 'app-officer-jobs-list',
  standalone: true,
  imports: [DatePipe, MatDialogModule],
  templateUrl: './jobs-list.component.html',
  styleUrl: './jobs-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfficerJobsList implements OnInit {
  private readonly service = inject(OfficerJobsService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pageRequests = new Subject<OfficerJobsQuery>();

  readonly pageIndex = signal(0);
  readonly state = signal<JobsListState>({ status: 'loading' });
  readonly actingOnJobId = signal<number | null>(null);
  readonly deletingJobId = signal<number | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly actionSuccess = signal<string | null>(null);

  ngOnInit(): void {
    this.pageRequests.pipe(
      switchMap(query => {
        this.state.set({ status: 'loading' });
        return this.service.listJobs(query).pipe(
          map(page => ({ status: 'ready' as const, page })),
          catchError((error: unknown) => of({
            status: 'error' as const,
            message: this.errorMessage(error),
          })),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(state => this.state.set(state));

    this.load();
  }

  load(): void {
    this.pageRequests.next({
      page: this.pageIndex(),
      size: OFFICER_JOBS_PAGE_SIZE,
      sort: OFFICER_JOBS_DEFAULT_SORT,
    });
  }

  changePage(page: number): void {
    const current = this.state();
    if (current.status !== 'ready'
      || this.actingOnJobId() !== null
      || this.deletingJobId() !== null
      || !Number.isInteger(page)
      || page < 0
      || page >= current.page.totalPages
      || page === this.pageIndex()) {
      return;
    }

    this.pageIndex.set(page);
    this.load();
  }

  retry(): void {
    this.load();
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
    if (this.actingOnJobId() !== null || this.deletingJobId() !== null || !this.canPerformAction(job, action)) return;

    this.dialog.open(JobStatusConfirmationDialog, {
      data: { action, jobTitle: job.jobTitle, companyName: job.companyName },
      role: 'alertdialog',
    }).afterClosed().pipe(
      filter(confirmed => confirmed === true),
      switchMap(() => {
        const latestJob = this.currentJob(job.id);
        if (this.actingOnJobId() !== null || this.deletingJobId() !== null
          || !latestJob || !this.canPerformAction(latestJob, action)) return EMPTY;

        this.actingOnJobId.set(job.id);
        this.actionError.set(null);
        this.actionSuccess.set(null);
        const request = action === 'publish'
          ? this.service.publishJob(job.id)
          : this.service.closeJob(job.id);

        return request.pipe(
          map(updated => ({ updated })),
          catchError((error: unknown) => {
            this.actionError.set(jobStatusActionErrorMessage(error, action));
            if (error instanceof ApiError && (error.status === 404 || error.status === 409)) this.load();
            return EMPTY;
          }),
          finalize(() => this.actingOnJobId.set(null)),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ updated }) => {
      this.state.update(current => current.status === 'ready'
        ? {
          ...current,
          page: {
            ...current.page,
            content: current.page.content.map(job => job.id === updated.id ? updated : job),
          },
        }
        : current);
      this.actionSuccess.set(action === 'publish' ? 'Job published successfully.' : 'Job closed successfully.');
    });
  }

  confirmDelete(job: JobResponse): void {
    if (this.actingOnJobId() !== null || this.deletingJobId() !== null || !this.canDelete(job)) return;

    this.dialog.open(JobDeleteConfirmationDialog, {
      data: { jobTitle: job.jobTitle, companyName: job.companyName },
      role: 'alertdialog',
    }).afterClosed().pipe(
      filter(confirmed => confirmed === true),
      switchMap(() => {
        const latestJob = this.currentJob(job.id);
        if (this.actingOnJobId() !== null || this.deletingJobId() !== null
          || !latestJob || !this.canDelete(latestJob)) return EMPTY;

        this.deletingJobId.set(job.id);
        this.actionError.set(null);
        this.actionSuccess.set(null);
        return this.service.deleteJob(job.id).pipe(
          map(() => job.id),
          catchError((error: unknown) => {
            this.actionError.set(jobDeleteErrorMessage(error));
            if (error instanceof ApiError && (error.status === 404 || error.status === 409)) this.load();
            return EMPTY;
          }),
          finalize(() => this.deletingJobId.set(null)),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(deletedId => {
      this.removeDeletedJob(deletedId);
      this.actionSuccess.set('Job deleted successfully.');
    });
  }

  private removeDeletedJob(id: number): void {
    const current = this.state();
    if (current.status !== 'ready') return;

    const content = current.page.content.filter(job => job.id !== id);
    const totalElements = Math.max(0, current.page.totalElements - 1);
    const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / current.page.size);
    const pageNumber = current.page.page;
    if (content.length === 0 && totalPages > 0 && pageNumber >= totalPages) {
      this.pageIndex.set(totalPages - 1);
      this.load();
      return;
    }

    this.state.set({
      status: 'ready',
      page: {
        ...current.page,
        content,
        totalElements,
        totalPages,
        first: pageNumber === 0,
        last: totalPages === 0 || pageNumber >= totalPages - 1,
        hasNext: pageNumber < totalPages - 1,
        hasPrevious: pageNumber > 0,
      },
    });
  }

  private currentJob(id: number): JobResponse | null {
    const current = this.state();
    return current.status === 'ready'
      ? current.page.content.find(job => job.id === id) ?? null
      : null;
  }

  private canPerformAction(job: JobResponse, action: JobStatusAction): boolean {
    return action === 'publish' ? this.canPublish(job) : this.canClose(job);
  }

  private errorMessage(error: unknown): string {
    return error instanceof ApiError ? error.message : 'Your jobs could not be loaded. Please try again.';
  }
}
