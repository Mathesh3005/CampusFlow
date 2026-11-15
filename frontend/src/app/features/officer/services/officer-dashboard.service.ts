import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, catchError, expand, last, map, of } from 'rxjs';
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
import {
  OFFICER_JOBS_DEFAULT_SORT,
  OfficerJobsService,
} from './officer-jobs.service';
import { OfficerNotificationsService } from './officer-notifications.service';

const RECENT_ITEMS_LIMIT = 5;
const MAX_INTERVIEW_PAGES = 5;

export interface OfficerJobsOverview {
  totalJobs: number;
  statusTotals: {
    published: number | null;
    draft: number | null;
    closed: number | null;
  };
}

export interface OfficerApplicationsOverview {
  totalApplications: number;
  statusTotals: {
    awaitingReview: number | null;
    shortlisted: number | null;
    selected: number | null;
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
  private readonly jobs = inject(OfficerJobsService);
  private readonly applications = inject(OfficerApplicationsService);
  private readonly interviews = inject(OfficerInterviewsService);
  private readonly notifications = inject(OfficerNotificationsService);

  loadJobsOverview(): Observable<OfficerJobsOverview> {
    return this.jobs.listJobs({ page: 0, size: 1, sort: OFFICER_JOBS_DEFAULT_SORT }).pipe(
      map(page => ({
        totalJobs: page.totalElements,
        statusTotals: {
          published: page.totalElements === 0 ? 0 : null,
          draft: page.totalElements === 0 ? 0 : null,
          closed: page.totalElements === 0 ? 0 : null,
        },
      })),
    );
  }

  loadApplicationsOverview(): Observable<OfficerApplicationsOverview> {
    return this.applications.listApplications({
      page: 0,
      size: RECENT_ITEMS_LIMIT,
      sort: OFFICER_APPLICATIONS_DEFAULT_SORT,
    }).pipe(
      map(page => ({
        totalApplications: page.totalElements,
        statusTotals: {
          awaitingReview: page.totalElements === 0 ? 0 : null,
          shortlisted: page.totalElements === 0 ? 0 : null,
          selected: page.totalElements === 0 ? 0 : null,
        },
        recentApplications: page.content.slice(0, RECENT_ITEMS_LIMIT),
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
