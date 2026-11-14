import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, filter, finalize, map, of, switchMap } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { ApplicationResponse, ApplicationStatus, PageResponse } from '../../../../core/models/domain.models';
import { StudentApplicationsService } from '../../services/student-applications.service';
import { WithdrawalConfirmationDialog } from './withdrawal-confirmation-dialog.component';

type ApplicationsListState =
  | { status: 'loading' }
  | { status: 'ready'; page: PageResponse<ApplicationResponse> }
  | { status: 'error'; message: string; requiresLogin: boolean };

@Component({
  selector: 'app-student-applications-list',
  standalone: true,
  imports: [DatePipe, MatDialogModule, RouterLink],
  templateUrl: './applications-list.component.html',
  styleUrl: './applications-list.component.scss',
})
export class StudentApplicationsList implements OnInit {
  private readonly applications = inject(StudentApplicationsService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pageRequests = new Subject<number>();
  readonly pageSize = 20;
  readonly pageIndex = signal(0);
  readonly state = signal<ApplicationsListState>({ status: 'loading' });
  readonly withdrawingId = signal<number | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly needsLogin = signal(false);

  ngOnInit(): void {
    this.pageRequests.pipe(
      switchMap(page => {
        this.state.set({ status: 'loading' });
        return this.applications.listApplications(page, this.pageSize).pipe(
          map(result => ({ status: 'ready' as const, page: result })),
          catchError((error: unknown) => of({
            status: 'error' as const,
            message: this.listErrorMessage(error),
            requiresLogin: this.isUnauthorized(error),
          })),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(result => {
      if (result.status === 'ready' && result.page.totalPages > 0 && result.page.page >= result.page.totalPages) {
        this.pageIndex.set(result.page.totalPages - 1);
        this.load();
        return;
      }
      this.needsLogin.set(result.status === 'error' && result.requiresLogin);
      this.state.set(result);
    });

    this.load();
  }

  load(): void {
    this.pageRequests.next(this.pageIndex());
  }

  changePage(page: number): void {
    const current = this.state();
    if (current.status !== 'ready' || page < 0 || page >= current.page.totalPages || page === this.pageIndex()) return;
    this.pageIndex.set(page);
    this.successMessage.set(null);
    this.actionError.set(null);
    this.needsLogin.set(false);
    this.load();
  }

  canWithdraw(application: ApplicationResponse): boolean {
    return application.status === ApplicationStatus.Applied
      || application.status === ApplicationStatus.UnderReview
      || application.status === ApplicationStatus.Shortlisted;
  }

  confirmWithdrawal(application: ApplicationResponse): void {
    if (!this.canWithdraw(application) || this.withdrawingId() !== null) return;

    this.dialog.open(WithdrawalConfirmationDialog, {
      data: { jobTitle: application.jobTitle, companyName: application.companyName },
      role: 'alertdialog',
    }).afterClosed().pipe(
      filter(confirmed => confirmed === true),
      switchMap(() => {
        this.withdrawingId.set(application.id);
        this.successMessage.set(null);
        this.actionError.set(null);
        this.needsLogin.set(false);
        return this.applications.withdrawApplication(application.id).pipe(
          map(updated => ({ status: 'success' as const, updated })),
          catchError((error: unknown) => {
            this.actionError.set(this.withdrawalErrorMessage(error));
            this.needsLogin.set(this.isUnauthorized(error));
            if (error instanceof ApiError && (error.status === 404 || error.status === 409)) this.load();
            return EMPTY;
          }),
          finalize(() => this.withdrawingId.set(null)),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(result => {
      this.successMessage.set(`Application for ${result.updated.jobTitle} was withdrawn.`);
      this.load();
    });
  }

  retry(): void {
    this.needsLogin.set(false);
    this.load();
  }

  private listErrorMessage(error: unknown): string {
    if (error instanceof ApiError && error.status === 401) return 'Your session has expired. Sign in again to view applications.';
    if (error instanceof ApiError && error.status === 404) return 'Your applications could not be found. Please try again.';
    return 'Applications could not be loaded. Please try again.';
  }

  private withdrawalErrorMessage(error: unknown): string {
    if (error instanceof ApiError && error.status === 401) return 'Your session has expired. Sign in again before withdrawing an application.';
    if (error instanceof ApiError && error.status === 404) return 'This application could not be found. Your list has been refreshed.';
    if (error instanceof ApiError && error.status === 409) return 'This application can no longer be withdrawn. Your list has been refreshed.';
    return 'The application could not be withdrawn. Please try again.';
  }

  private isUnauthorized(error: unknown): boolean {
    return error instanceof ApiError && error.status === 401;
  }
}
