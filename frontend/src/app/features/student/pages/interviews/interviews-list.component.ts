import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Observable, Subject, catchError, map, of, switchMap } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { InterviewResponse, InterviewStatus, PageResponse } from '../../../../core/models/domain.models';
import { StudentInterviewsService, STUDENT_INTERVIEWS_DEFAULT_SORT, STUDENT_INTERVIEWS_PAGE_SIZE } from '../../services/student-interviews.service';

type StudentInterviewsState =
  | { status: 'loading' }
  | { status: 'ready'; page: PageResponse<InterviewResponse> }
  | { status: 'error'; message: string; unauthorized: boolean };

@Component({
  selector: 'app-student-interviews-list',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './interviews-list.component.html',
  styleUrl: './interviews-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentInterviewsList implements OnInit {
  private readonly service = inject(StudentInterviewsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pageRequests = new Subject<number>();

  readonly pageSize = STUDENT_INTERVIEWS_PAGE_SIZE;
  readonly pageIndex = signal(0);
  readonly state = signal<StudentInterviewsState>({ status: 'loading' });
  readonly interviewSections = computed(() => {
    const now = Date.now();
    const interviews = this.currentPageInterviews();
    return {
      upcoming: interviews.filter(interview => interview.status === InterviewStatus.Scheduled
        && Date.parse(interview.scheduledAt) >= now),
      past: interviews.filter(interview => interview.status !== InterviewStatus.Scheduled
        || Date.parse(interview.scheduledAt) < now),
    };
  });

  ngOnInit(): void {
    this.pageRequests.pipe(
      switchMap(page => {
        this.state.set({ status: 'loading' });
        return this.service.listInterviews({
          page,
          size: this.pageSize,
          sort: STUDENT_INTERVIEWS_DEFAULT_SORT,
        }).pipe(
          map(result => ({ status: 'ready' as const, page: result })),
          catchError((error: unknown) => of({
            status: 'error' as const,
            message: this.errorMessage(error),
            unauthorized: error instanceof ApiError && error.status === 401,
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
      this.state.set(result);
    });
    this.load();
  }

  load(): void {
    this.pageRequests.next(this.pageIndex());
  }

  changePage(page: number): void {
    const current = this.state();
    if (current.status !== 'ready'
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

  private currentPageInterviews(): InterviewResponse[] {
    const current = this.state();
    return current.status === 'ready' ? current.page.content : [];
  }

  private errorMessage(error: unknown): string {
    if (error instanceof ApiError && error.status === 401) return 'Your session has expired. Sign in again to view interviews.';
    if (error instanceof ApiError && error.status === 403) return 'You do not have permission to view these interviews.';
    return 'Interviews could not be loaded. Please try again.';
  }
}
