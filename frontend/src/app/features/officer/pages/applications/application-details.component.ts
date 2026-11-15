import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, Observable, Subject, catchError, filter, finalize, map, merge, of, switchMap } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { ApplicationResponse, ApplicationStatus } from '../../../../core/models/domain.models';
import { OfficerApplicationStatus, OfficerApplicationsService } from '../../services/officer-applications.service';
import { ApplicationStatusConfirmationDialog } from './application-status-confirmation-dialog.component';

const OFFICER_STATUS_TRANSITIONS: Record<ApplicationStatus, readonly OfficerApplicationStatus[]> = {
  [ApplicationStatus.Applied]: [ApplicationStatus.UnderReview, ApplicationStatus.Rejected],
  [ApplicationStatus.UnderReview]: [ApplicationStatus.Shortlisted, ApplicationStatus.Rejected],
  [ApplicationStatus.Shortlisted]: [ApplicationStatus.Selected, ApplicationStatus.Rejected],
  [ApplicationStatus.Rejected]: [],
  [ApplicationStatus.Selected]: [],
  [ApplicationStatus.Withdrawn]: [],
};

type ApplicationDetailsState =
  | { status: 'loading' }
  | { status: 'ready'; application: ApplicationResponse }
  | { status: 'invalid' }
  | { status: 'unauthorized' }
  | { status: 'forbidden' }
  | { status: 'notFound' }
  | { status: 'error'; message: string };

@Component({
  selector: 'app-officer-application-details',
  standalone: true,
  imports: [DatePipe, MatDialogModule, RouterLink],
  templateUrl: './application-details.component.html',
  styleUrl: './application-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfficerApplicationDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(OfficerApplicationsService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly retryRequests = new Subject<string | null>();

  readonly state = signal<ApplicationDetailsState>({ status: 'loading' });
  readonly actionPending = signal(false);
  readonly pendingStatus = signal<OfficerApplicationStatus | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly actionErrorCanRefresh = signal(false);
  readonly actionSuccess = signal<string | null>(null);

  ngOnInit(): void {
    merge(
      this.route.paramMap.pipe(map(params => params.get('id'))),
      this.retryRequests,
    ).pipe(
      switchMap(id => this.loadApplication(id)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(result => this.state.set(result));
  }

  retry(): void {
    this.actionError.set(null);
    this.actionErrorCanRefresh.set(false);
    this.actionSuccess.set(null);
    this.retryRequests.next(this.route.snapshot.paramMap.get('id'));
  }

  availableTransitions(status: ApplicationStatus): readonly OfficerApplicationStatus[] {
    return OFFICER_STATUS_TRANSITIONS[status];
  }

  statusLabel(status: ApplicationStatus): string {
    return status.replace('_', ' ');
  }

  statusActionLabel(status: OfficerApplicationStatus): string {
    switch (status) {
      case ApplicationStatus.UnderReview: return 'Move to under review';
      case ApplicationStatus.Shortlisted: return 'Shortlist';
      case ApplicationStatus.Rejected: return 'Reject';
      case ApplicationStatus.Selected: return 'Select';
    }
  }

  confirmStatusChange(application: ApplicationResponse, targetStatus: OfficerApplicationStatus): void {
    if (this.actionPending() || !this.canTransition(application.status, targetStatus)) return;

    this.actionError.set(null);
    this.actionErrorCanRefresh.set(false);
    this.actionSuccess.set(null);

    this.dialog.open(ApplicationStatusConfirmationDialog, {
      data: {
        targetStatus,
        jobTitle: application.jobTitle,
        companyName: application.companyName,
      },
      role: 'alertdialog',
    }).afterClosed().pipe(
      filter(confirmed => confirmed === true),
      switchMap(() => {
        const latest = this.currentApplication();
        if (this.actionPending() || !latest || latest.id !== application.id
          || latest.status !== application.status || !this.canTransition(latest.status, targetStatus)) {
          return EMPTY;
        }

        this.actionPending.set(true);
        this.pendingStatus.set(targetStatus);
        return this.service.updateApplicationStatus(latest.id, targetStatus).pipe(
          catchError((error: unknown) => {
            this.setStatusActionError(error);
            return EMPTY;
          }),
          finalize(() => {
            this.actionPending.set(false);
            this.pendingStatus.set(null);
          }),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(updated => {
      this.state.set({ status: 'ready', application: updated });
      this.actionSuccess.set(`Application status updated to ${this.statusLabel(updated.status)}.`);
    });
  }

  private canTransition(current: ApplicationStatus, target: OfficerApplicationStatus): boolean {
    return this.availableTransitions(current).includes(target);
  }

  private currentApplication(): ApplicationResponse | null {
    const current = this.state();
    return current.status === 'ready' ? current.application : null;
  }

  private setStatusActionError(error: unknown): void {
    this.actionErrorCanRefresh.set(error instanceof ApiError && (error.status === 404 || error.status === 409));

    if (!(error instanceof ApiError)) {
      this.actionError.set('The application status could not be updated. Please try again.');
    } else if (error.status === 400) {
      this.actionError.set('The status change was not accepted. The application details were not changed.');
    } else if (error.status === 401) {
      this.actionError.set('Your session has expired. Sign in again to manage applications.');
    } else if (error.status === 403) {
      this.actionError.set('You do not have permission to change this application.');
    } else if (error.status === 404) {
      this.actionError.set('This application could not be found or is no longer available. Refresh its details.');
    } else if (error.status === 409) {
      this.actionError.set('The application status may have changed since this page loaded. Refresh it before choosing another action.');
    } else if (error.status >= 500) {
      this.actionError.set('The server could not update this application. Please try again.');
    } else {
      this.actionError.set('The application status could not be updated. Please try again.');
    }
  }

  private loadApplication(idValue: string | null): Observable<ApplicationDetailsState> {
    if (idValue === null || !/^[0-9]+$/.test(idValue)) {
      return of({ status: 'invalid' });
    }

    const id = Number(idValue);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return of({ status: 'invalid' });
    }

    this.actionError.set(null);
    this.actionErrorCanRefresh.set(false);
    this.actionSuccess.set(null);
    this.state.set({ status: 'loading' });
    return this.service.getApplicationById(id).pipe(
      map(application => ({ status: 'ready' as const, application })),
      catchError((error: unknown) => of(this.errorState(error))),
    );
  }

  private errorState(error: unknown): ApplicationDetailsState {
    if (error instanceof ApiError) {
      if (error.status === 401) return { status: 'unauthorized' };
      if (error.status === 403) return { status: 'forbidden' };
      if (error.status === 404) return { status: 'notFound' };
    }

    return {
      status: 'error',
      message: error instanceof ApiError && error.status >= 500
        ? 'The server could not load this application. Please try again.'
        : 'Application details could not be loaded. Please try again.',
    };
  }
}
