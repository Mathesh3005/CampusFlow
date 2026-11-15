import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, Observable, Subject, catchError, filter, finalize, map, merge, of, switchMap } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { InterviewResponse, InterviewStatus } from '../../../../core/models/domain.models';
import { OfficerInterviewsService, OfficerInterviewStatus } from '../../services/officer-interviews.service';
import { InterviewConfirmationDialog } from './interview-confirmation-dialog.component';

type OfficerInterviewDetailsState =
  | { status: 'loading' }
  | { status: 'ready'; interview: InterviewResponse }
  | { status: 'invalid' }
  | { status: 'unauthorized' }
  | { status: 'forbidden' }
  | { status: 'notFound' }
  | { status: 'deleted' }
  | { status: 'error'; message: string };

@Component({
  selector: 'app-officer-interview-details',
  standalone: true,
  imports: [DatePipe, MatDialogModule, RouterLink],
  templateUrl: './interview-details.component.html',
  styleUrl: './interview-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfficerInterviewDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(OfficerInterviewsService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly retryRequests = new Subject<string | null>();

  readonly state = signal<OfficerInterviewDetailsState>({ status: 'loading' });
  readonly actionPending = signal(false);
  readonly actionError = signal<string | null>(null);
  readonly actionErrorCanRefresh = signal(false);
  readonly actionSuccess = signal<string | null>(null);
  readonly completedStatus = InterviewStatus.Completed;
  readonly cancelledStatus = InterviewStatus.Cancelled;

  ngOnInit(): void {
    merge(
      this.route.paramMap.pipe(map(params => params.get('id'))),
      this.retryRequests,
    ).pipe(
      switchMap(id => this.loadInterview(id)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(result => this.state.set(result));
  }

  retry(): void {
    this.actionError.set(null);
    this.actionErrorCanRefresh.set(false);
    this.actionSuccess.set(null);
    this.retryRequests.next(this.route.snapshot.paramMap.get('id'));
  }

  canManageScheduled(interview: InterviewResponse): boolean {
    return interview.status === InterviewStatus.Scheduled;
  }

  confirmStatusChange(interview: InterviewResponse, status: OfficerInterviewStatus): void {
    if (this.actionPending() || !this.canManageScheduled(interview)) return;
    const cancelling = status === InterviewStatus.Cancelled;
    this.confirmAndRun(interview, {
      title: cancelling ? 'Cancel this interview?' : 'Complete this interview?',
      message: cancelling
        ? `Cancel the interview for application #${interview.applicationId}?`
        : `Mark the interview for application #${interview.applicationId} as completed?`,
      confirmLabel: cancelling ? 'Cancel interview' : 'Mark completed',
      destructive: cancelling,
    }, () => this.service.updateInterviewStatus(interview.id, status), updated => {
      this.state.set({ status: 'ready', interview: updated });
      this.actionSuccess.set(cancelling ? 'Interview cancelled successfully.' : 'Interview marked completed.');
    }, interview);
  }

  confirmDelete(interview: InterviewResponse): void {
    if (this.actionPending()) return;
    this.confirmAndRun(interview, {
      title: 'Delete this interview?',
      message: `Permanently delete the interview for application #${interview.applicationId}?`,
      confirmLabel: 'Delete interview',
      destructive: true,
    }, () => this.service.deleteInterview(interview.id), () => {
      this.state.set({ status: 'deleted' });
      this.actionSuccess.set('Interview deleted successfully.');
    });
  }

  private confirmAndRun<T extends InterviewResponse | void>(
    interview: InterviewResponse,
    data: { title: string; message: string; confirmLabel: string; destructive?: boolean },
    request: () => Observable<T>,
    onSuccess: (result: T) => void,
    requireScheduledInterview?: InterviewResponse,
  ): void {
    this.dialog.open(InterviewConfirmationDialog, {
      data,
      role: 'alertdialog',
    }).afterClosed().pipe(
      filter(confirmed => confirmed === true),
      switchMap(() => {
        const latest = this.currentInterview();
        if (this.actionPending() || !latest || latest.id !== interview.id
          || (requireScheduledInterview !== undefined
            && (latest.status !== requireScheduledInterview.status || !this.canManageScheduled(latest)))) {
          return EMPTY;
        }

        this.actionPending.set(true);
        this.actionError.set(null);
        this.actionErrorCanRefresh.set(false);
        this.actionSuccess.set(null);
        return request().pipe(
          catchError((error: unknown) => {
            this.setActionError(error);
            return EMPTY;
          }),
          finalize(() => this.actionPending.set(false)),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(result => onSuccess(result));
  }

  private currentInterview(): InterviewResponse | null {
    const current = this.state();
    return current.status === 'ready' ? current.interview : null;
  }

  private setActionError(error: unknown): void {
    this.actionErrorCanRefresh.set(error instanceof ApiError && (error.status === 404 || error.status === 409));
    if (!(error instanceof ApiError)) {
      this.actionError.set('The interview could not be updated. Please try again.');
    } else if (error.status === 400) {
      this.actionError.set('The request was not accepted. Check the interview details and try again.');
    } else if (error.status === 401) {
      this.actionError.set('Your session has expired. Sign in again to manage interviews.');
    } else if (error.status === 403) {
      this.actionError.set('You do not have permission to change this interview.');
    } else if (error.status === 404) {
      this.actionError.set('This interview could not be found or is no longer available. Refresh its details.');
    } else if (error.status === 409) {
      this.actionError.set('This interview may have changed since it was loaded. Refresh its details before trying again.');
    } else if (error.status >= 500) {
      this.actionError.set('The server could not update this interview. Please try again.');
    } else {
      this.actionError.set('The interview could not be updated. Please try again.');
    }
  }

  private loadInterview(idValue: string | null): Observable<OfficerInterviewDetailsState> {
    if (idValue === null || !/^[0-9]+$/.test(idValue)) return of({ status: 'invalid' });
    const id = Number(idValue);
    if (!Number.isSafeInteger(id) || id <= 0) return of({ status: 'invalid' });

    this.actionError.set(null);
    this.actionErrorCanRefresh.set(false);
    this.actionSuccess.set(null);
    this.state.set({ status: 'loading' });
    return this.service.getInterviewById(id).pipe(
      map(interview => ({ status: 'ready' as const, interview })),
      catchError((error: unknown) => of(this.errorState(error))),
    );
  }

  private errorState(error: unknown): OfficerInterviewDetailsState {
    if (error instanceof ApiError) {
      if (error.status === 401) return { status: 'unauthorized' };
      if (error.status === 403) return { status: 'forbidden' };
      if (error.status === 404) return { status: 'notFound' };
    }
    return {
      status: 'error',
      message: error instanceof ApiError && error.status >= 500
        ? 'The server could not load this interview. Please try again.'
        : 'Interview details could not be loaded. Please try again.',
    };
  }
}
