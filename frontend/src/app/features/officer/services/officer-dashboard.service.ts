import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, Observable, catchError, expand, forkJoin, last, map, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiError } from '../../../core/http/api-error.handler';
import {
  ApplicationResponse,
  InterviewResponse,
  InterviewStatus,
  NotificationResponse,
  PageResponse,
} from '../../../core/models/domain.models';
import {
  NOTIFICATIONS_DEFAULT_SORT,
  NOTIFICATIONS_PAGE_SIZE,
} from '../../notifications/services/notification-api';
import {
  OFFICER_APPLICATIONS_DEFAULT_SORT,
  OfficerApplicationsService,
} from './officer-applications.service';
import {
  OFFICER_INTERVIEWS_PAGE_SIZE,
  OFFICER_INTERVIEWS_DEFAULT_SORT,
  OfficerInterviewsService,
} from './officer-interviews.service';
import { OfficerNotificationsService } from './officer-notifications.service';

const RECENT_ITEMS_LIMIT = 5;
const MAX_INTERVIEW_PAGES = 5;

interface OfficerDashboardResponse {
  totalJobs: number;
  publishedJobs: number;
  draftJobs: number;
  closedJobs: number;
  totalApplications: number;
  pendingApplications: number;
  underReviewApplications: number;
  shortlistedApplications: number;
  selectedApplications: number;
  rejectedApplications: number;
  withdrawnApplications: number;
  scheduledInterviews: number;
}

export interface OfficerJobsOverview {
  totalJobs: number;
  statusTotals: {
    published: number;
    draft: number;
    closed: number;
  };
}

export interface OfficerApplicationsOverview {
  totalApplications: number;
  statusTotals: {
    awaitingReview: number;
    shortlisted: number;
    selected: number;
  };
  recentApplications: ApplicationResponse[];
}

export interface OfficerUpcomingInterviews {
  interviews: InterviewResponse[];
  upcomingTotal: number | null;
  partialResults: boolean;
  warning: string | null;
}

interface InterviewScan {
  interviews: InterviewResponse[];
  latestPage: PageResponse<InterviewResponse>;
  pagesFetched: number;
  hasMoreUpcoming: boolean;
  error: string | null;
}

@Injectable()
export class OfficerDashboardService {
  private readonly http = inject(HttpClient);
  private readonly applications = inject(OfficerApplicationsService);
  private readonly interviews = inject(OfficerInterviewsService);
  private readonly notifications = inject(OfficerNotificationsService);
  private readonly dashboardUrl = `${environment.apiBaseUrl}/officer/dashboard`;

  loadJobsOverview(): Observable<OfficerJobsOverview> {
    return this.http.get<OfficerDashboardResponse>(this.dashboardUrl).pipe(
      map(dashboard => ({
        totalJobs: dashboard.totalJobs,
        statusTotals: {
          published: dashboard.publishedJobs,
          draft: dashboard.draftJobs,
          closed: dashboard.closedJobs,
        },
      })),
    );
  }

  loadApplicationsOverview(): Observable<OfficerApplicationsOverview> {
    return forkJoin({
      dashboard: this.http.get<OfficerDashboardResponse>(this.dashboardUrl),
      recent: this.applications.listApplications({
        page: 0,
        size: RECENT_ITEMS_LIMIT,
        sort: OFFICER_APPLICATIONS_DEFAULT_SORT,
      }),
    }).pipe(
      map(({ dashboard, recent }) => ({
        totalApplications: dashboard.totalApplications,
        statusTotals: {
          awaitingReview: dashboard.pendingApplications,
          shortlisted: dashboard.shortlistedApplications,
          selected: dashboard.selectedApplications,
        },
        recentApplications: recent.content.slice(0, RECENT_ITEMS_LIMIT),
      })),
    );
  }

  loadUpcomingInterviews(): Observable<OfficerUpcomingInterviews> {
    const now = Date.now();
    return this.fetchInterviewPage(0).pipe(
      map(page => this.createInterviewScan(page, now)),
      expand(scan => {
        if (scan.error
          || scan.interviews.length >= RECENT_ITEMS_LIMIT
          || !scan.latestPage.hasNext
          || scan.pagesFetched >= MAX_INTERVIEW_PAGES) {
          return EMPTY;
        }

        return this.fetchInterviewPage(scan.pagesFetched).pipe(
          map(page => this.extendInterviewScan(scan, page, now)),
          catchError((error: unknown) => of({ ...scan, error: this.errorMessage(error) })),
        );
      }),
      last(),
      map(scan => ({
        interviews: scan.interviews,
        upcomingTotal: scan.latestPage.totalElements === 0 ? 0 : null,
        partialResults: Boolean(scan.error)
          || scan.hasMoreUpcoming
          || (scan.latestPage.hasNext
            && (scan.interviews.length >= RECENT_ITEMS_LIMIT || scan.pagesFetched >= MAX_INTERVIEW_PAGES)),
        warning: scan.error,
      })),
    );
  }

  loadRecentNotifications(): Observable<NotificationResponse[]> {
    return this.notifications.listNotifications({
      page: 0,
      size: NOTIFICATIONS_PAGE_SIZE,
      sort: NOTIFICATIONS_DEFAULT_SORT,
    }).pipe(
      map(page => page.content.slice(0, RECENT_ITEMS_LIMIT)),
    );
  }

  private fetchInterviewPage(page: number): Observable<PageResponse<InterviewResponse>> {
    return this.interviews.listInterviews({
      page,
      size: OFFICER_INTERVIEWS_PAGE_SIZE,
      sort: OFFICER_INTERVIEWS_DEFAULT_SORT,
    });
  }

  private createInterviewScan(page: PageResponse<InterviewResponse>, now: number): InterviewScan {
    const matching = this.upcomingFrom(page.content, now);
    return {
      interviews: matching.slice(0, RECENT_ITEMS_LIMIT),
      latestPage: page,
      pagesFetched: 1,
      hasMoreUpcoming: matching.length > RECENT_ITEMS_LIMIT,
      error: null,
    };
  }

  private extendInterviewScan(
    scan: InterviewScan,
    page: PageResponse<InterviewResponse>,
    now: number,
  ): InterviewScan {
    const matching = this.upcomingFrom(page.content, now);
    const combined = [...scan.interviews, ...matching]
      .sort((left, right) => Date.parse(left.scheduledAt) - Date.parse(right.scheduledAt));
    return {
      interviews: combined.slice(0, RECENT_ITEMS_LIMIT),
      latestPage: page,
      pagesFetched: scan.pagesFetched + 1,
      hasMoreUpcoming: scan.hasMoreUpcoming || combined.length > RECENT_ITEMS_LIMIT,
      error: null,
    };
  }

  private upcomingFrom(interviews: InterviewResponse[], now: number): InterviewResponse[] {
    return interviews
      .filter(interview =>
        interview.status === InterviewStatus.Scheduled
        && Date.parse(interview.scheduledAt) > now)
      .sort((left, right) => Date.parse(left.scheduledAt) - Date.parse(right.scheduledAt));
  }

  private errorMessage(error: unknown): string {
    return error instanceof ApiError ? error.message : 'This interview preview could not be completed.';
  }
}
