import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, catchError, expand, forkJoin, last, map, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiError } from '../../../core/http/api-error.handler';
import { ApplicationResponse, InterviewResponse, JobResponse, NotificationResponse, PageResponse } from '../../../core/models/domain.models';
import { NOTIFICATIONS_DEFAULT_SORT, NOTIFICATIONS_PAGE_SIZE } from '../../notifications/services/notification-api';
import { DashboardSection, InterviewDashboardSection, StudentDashboardData } from '../models/dashboard.models';
import { STUDENT_INTERVIEWS_DEFAULT_SORT, STUDENT_INTERVIEWS_PAGE_SIZE, StudentInterviewsService } from './student-interviews.service';
import { StudentNotificationsService } from './student-notifications.service';

const MAX_INTERVIEW_PAGES = 5;
const UPCOMING_INTERVIEW_LIMIT = 5;
const RECENT_NOTIFICATION_LIMIT = 5;

interface InterviewScan {
  interviews: InterviewResponse[];
  latestPage: PageResponse<InterviewResponse>;
  pagesFetched: number;
  error: string | null;
}

@Injectable()
export class StudentDashboardService {
  private readonly http = inject(HttpClient);
  private readonly interviews = inject(StudentInterviewsService);
  private readonly notifications = inject(StudentNotificationsService);
  private readonly baseUrl = environment.apiBaseUrl;

  loadDashboard(): Observable<StudentDashboardData> {
    return forkJoin({
      applications: this.loadSection<ApplicationResponse>('/student/applications', 5, 'appliedAt,desc'),
      jobs: this.loadSection<JobResponse>('/student/jobs', 4, 'createdAt,desc'),
      interviews: this.loadUpcomingInterviews(),
      notifications: this.loadRecentNotifications(),
    });
  }

  private loadUpcomingInterviews(): Observable<InterviewDashboardSection> {
    const now = Date.now();
    return this.fetchInterviewPage(0).pipe(
      map(page => this.createInterviewScan(page, now)),
      expand(scan => {
        if (scan.error || scan.interviews.length >= UPCOMING_INTERVIEW_LIMIT || !scan.latestPage.hasNext || scan.pagesFetched >= MAX_INTERVIEW_PAGES) {
          return EMPTY;
        }

        return this.fetchInterviewPage(scan.pagesFetched).pipe(
          map(page => ({
            ...this.createInterviewScan(page, now),
            interviews: [...scan.interviews, ...this.upcomingFrom(page.content, now)].slice(0, UPCOMING_INTERVIEW_LIMIT),
            pagesFetched: scan.pagesFetched + 1,
          })),
          catchError((error: unknown) => of({ ...scan, error: this.errorMessage(error) })),
        );
      }),
      last(),
      map(scan => ({
        interviews: scan.interviews,
        error: scan.error,
        partialResults: !scan.error && scan.pagesFetched >= MAX_INTERVIEW_PAGES && scan.latestPage.hasNext,
      })),
      catchError((error: unknown) => of({ interviews: [], error: this.errorMessage(error), partialResults: false })),
    );
  }

  private fetchInterviewPage(page: number): Observable<PageResponse<InterviewResponse>> {
    return this.interviews.listInterviews({
      page,
      size: STUDENT_INTERVIEWS_PAGE_SIZE,
      sort: STUDENT_INTERVIEWS_DEFAULT_SORT,
    });
  }

  private loadRecentNotifications(): Observable<DashboardSection<NotificationResponse>> {
    return this.notifications.listNotifications({
      page: 0,
      size: NOTIFICATIONS_PAGE_SIZE,
      sort: NOTIFICATIONS_DEFAULT_SORT,
    }).pipe(
      map(page => ({
        page: { ...page, content: page.content.slice(0, RECENT_NOTIFICATION_LIMIT) },
        error: null,
      })),
      catchError((error: unknown) => of({
        page: null,
        error: this.errorMessage(error),
      })),
    );
  }

  private createInterviewScan(page: PageResponse<InterviewResponse>, now: number): InterviewScan {
    return { interviews: this.upcomingFrom(page.content, now), latestPage: page, pagesFetched: 1, error: null };
  }

  private upcomingFrom(interviews: InterviewResponse[], now: number): InterviewResponse[] {
    return interviews.filter(interview => interview.status === 'SCHEDULED' && Date.parse(interview.scheduledAt) > now);
  }

  private errorMessage(error: unknown): string {
    return error instanceof ApiError ? error.message : 'This section could not be loaded.';
  }

  private loadSection<T>(path: string, size: number, sort: string): Observable<DashboardSection<T>> {
    const params = new HttpParams().set('page', '0').set('size', String(size)).set('sort', sort);
    return this.http.get<PageResponse<T>>(`${this.baseUrl}${path}`, { params }).pipe(
      map(page => ({ page, error: null })),
      catchError((error: unknown) => of({
        page: null,
        error: this.errorMessage(error),
      })),
    );
  }
}
