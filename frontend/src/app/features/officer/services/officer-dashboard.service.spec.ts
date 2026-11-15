import { TestBed } from '@angular/core/testing';
import { throwError, of } from 'rxjs';
import {
  ApplicationResponse,
  ApplicationStatus,
  InterviewMode,
  InterviewResponse,
  InterviewStatus,
  JobResponse,
  NotificationResponse,
  NotificationType,
  PageResponse,
} from '../../../core/models/domain.models';
import { NOTIFICATIONS_DEFAULT_SORT, NOTIFICATIONS_PAGE_SIZE } from '../../notifications/services/notification-api';
import {
  OFFICER_APPLICATIONS_DEFAULT_SORT,
  OfficerApplicationsService,
} from './officer-applications.service';
import {
  OFFICER_INTERVIEWS_DEFAULT_SORT,
  OFFICER_INTERVIEWS_PAGE_SIZE,
  OfficerInterviewsService,
} from './officer-interviews.service';
import { OFFICER_JOBS_DEFAULT_SORT, OfficerJobsService } from './officer-jobs.service';
import { OfficerNotificationsService } from './officer-notifications.service';
import { OfficerDashboardService } from './officer-dashboard.service';

describe('OfficerDashboardService', () => {
  let service: OfficerDashboardService;
  let jobs: { listJobs: ReturnType<typeof vi.fn> };
  let applications: { listApplications: ReturnType<typeof vi.fn> };
  let interviews: { listInterviews: ReturnType<typeof vi.fn> };
  let notifications: { listNotifications: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    jobs = { listJobs: vi.fn(() => of(page<JobResponse>([], 0, 0))) };
    applications = { listApplications: vi.fn(() => of(page<ApplicationResponse>([], 0, 0))) };
    interviews = { listInterviews: vi.fn(() => of(page<InterviewResponse>([], 0, 0))) };
    notifications = { listNotifications: vi.fn(() => of(page<NotificationResponse>([], 0, 0))) };

    TestBed.configureTestingModule({
      providers: [
        OfficerDashboardService,
        { provide: OfficerJobsService, useValue: jobs },
        { provide: OfficerApplicationsService, useValue: applications },
        { provide: OfficerInterviewsService, useValue: interviews },
        { provide: OfficerNotificationsService, useValue: notifications },
      ],
    });
    service = TestBed.inject(OfficerDashboardService);
  });

  it('uses the exact jobs total and leaves unsupported status aggregates unavailable', () => {
    jobs.listJobs.mockReturnValue(of(page([], 0, 42)));
    let result: unknown;
    service.loadJobsOverview().subscribe(value => result = value);

    expect(jobs.listJobs).toHaveBeenCalledWith({
      page: 0,
      size: 1,
      sort: OFFICER_JOBS_DEFAULT_SORT,
    });
    expect(result).toEqual({
      totalJobs: 42,
      statusTotals: { published: null, draft: null, closed: null },
    });
  });

  it('reports zero job status totals only when there are no jobs', () => {
    let result: unknown;
    service.loadJobsOverview().subscribe(value => result = value);
    expect(result).toEqual({
      totalJobs: 0,
      statusTotals: { published: 0, draft: 0, closed: 0 },
    });
  });

  it('requests recent applications in newest-first order and keeps status aggregates unavailable', () => {
    const recent = [application(9), application(8)];
    applications.listApplications.mockReturnValue(of(page(recent, 0, 26)));
    let result: unknown;
    service.loadApplicationsOverview().subscribe(value => result = value);

    expect(applications.listApplications).toHaveBeenCalledWith({
      page: 0,
      size: 5,
      sort: OFFICER_APPLICATIONS_DEFAULT_SORT,
    });
    expect(result).toEqual({
      totalApplications: 26,
      statusTotals: { awaitingReview: null, shortlisted: null, selected: null },
      recentApplications: recent,
    });
  });

  it('reports zero application statuses only when the exact total is zero', () => {
    let result: unknown;
    service.loadApplicationsOverview().subscribe(value => result = value);
    expect(result).toEqual({
      totalApplications: 0,
      statusTotals: { awaitingReview: 0, shortlisted: 0, selected: 0 },
      recentApplications: [],
    });
  });

  it('reports zero upcoming interviews only when no interview records exist', () => {
    let result: unknown;
    service.loadUpcomingInterviews().subscribe(value => result = value);
    expect(result).toEqual({
      interviews: [],
      upcomingTotal: 0,
      partialResults: false,
      warning: null,
    });
  });

  it('finds and sorts only future scheduled interviews across bounded pages', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const later = new Date(Date.now() + 172_800_000).toISOString();
    const firstPage = page([
      interview(1, '2000-01-01T10:00:00Z', InterviewStatus.Scheduled),
      interview(2, future, InterviewStatus.Completed),
    ], 0, 21, true);
    const secondPage = page([
      interview(3, later, InterviewStatus.Scheduled),
      interview(4, future, InterviewStatus.Scheduled),
      interview(5, later, InterviewStatus.Cancelled),
    ], 1, 21, false);
    interviews.listInterviews.mockImplementation(({ page: pageNumber }: { page?: number }) =>
      of(pageNumber === 0 ? firstPage : secondPage));
    let result: unknown;

    service.loadUpcomingInterviews().subscribe(value => result = value);

    expect(interviews.listInterviews).toHaveBeenNthCalledWith(1, {
      page: 0,
      size: OFFICER_INTERVIEWS_PAGE_SIZE,
      sort: OFFICER_INTERVIEWS_DEFAULT_SORT,
    });
    expect(interviews.listInterviews).toHaveBeenNthCalledWith(2, {
      page: 1,
      size: OFFICER_INTERVIEWS_PAGE_SIZE,
      sort: OFFICER_INTERVIEWS_DEFAULT_SORT,
    });
    expect(result).toEqual({
      interviews: [interview(4, future, InterviewStatus.Scheduled), interview(3, later, InterviewStatus.Scheduled)],
      upcomingTotal: null,
      partialResults: false,
      warning: null,
    });
  });

  it('stops after the configured bounded interview page scan', () => {
    interviews.listInterviews.mockImplementation(({ page: pageNumber }: { page?: number }) =>
      of(page(Array.from({ length: 20 }, (_, index) =>
        interview((pageNumber ?? 0) * 20 + index + 1, '2000-01-01T10:00:00Z', InterviewStatus.Scheduled)),
      pageNumber ?? 0, 200, true)));
    let result: unknown;

    service.loadUpcomingInterviews().subscribe(value => result = value);

    expect(interviews.listInterviews).toHaveBeenCalledTimes(5);
    expect(result).toEqual({
      interviews: [],
      upcomingTotal: null,
      partialResults: true,
      warning: null,
    });
  });

  it('preserves found interviews when a later preview page fails', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    interviews.listInterviews
      .mockReturnValueOnce(of(page([interview(8, future, InterviewStatus.Scheduled)], 0, 21, true)))
      .mockReturnValueOnce(throwError(() => new Error('Second page failed')));
    let result: unknown;

    service.loadUpcomingInterviews().subscribe(value => result = value);

    expect(result).toEqual({
      interviews: [interview(8, future, InterviewStatus.Scheduled)],
      upcomingTotal: null,
      partialResults: true,
      warning: 'This interview preview could not be completed.',
    });
  });

  it('uses the existing officer notifications client and only returns the latest five', () => {
    const content = Array.from({ length: 8 }, (_, index) => notification(index + 1));
    notifications.listNotifications.mockReturnValue(of(page(content, 0, 8)));
    let result: NotificationResponse[] | undefined;

    service.loadRecentNotifications().subscribe(value => result = value);

    expect(notifications.listNotifications).toHaveBeenCalledWith({
      page: 0,
      size: NOTIFICATIONS_PAGE_SIZE,
      sort: NOTIFICATIONS_DEFAULT_SORT,
    });
    expect(result).toEqual(content.slice(0, 5));
  });
});

function application(id: number): ApplicationResponse {
  return {
    id,
    studentId: id + 100,
    jobId: 3,
    resumeId: null,
    companyName: 'CampusFlow Inc.',
    jobTitle: 'Graduate Engineer',
    coverLetter: null,
    status: ApplicationStatus.Applied,
    appliedAt: `2026-10-${String(id).padStart(2, '0')}T12:00:00Z`,
    updatedAt: '2026-10-10T12:00:00Z',
  };
}

function interview(
  id: number,
  scheduledAt: string,
  status: InterviewStatus,
): InterviewResponse {
  return {
    id,
    applicationId: 37,
    scheduledAt,
    interviewMode: InterviewMode.Online,
    locationOrLink: 'https://meet.example.test/room',
    status,
    notes: null,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
  };
}

function notification(id: number): NotificationResponse {
  return {
    id,
    userId: 4,
    title: `Notification ${id}`,
    message: 'A new placement update is available.',
    notificationType: NotificationType.System,
    isRead: id % 2 === 0,
    createdAt: `2026-10-${String(id).padStart(2, '0')}T10:00:00Z`,
  };
}

function page<T>(
  content: T[],
  pageNumber: number,
  totalElements: number,
  hasNext = false,
): PageResponse<T> {
  const totalPages = Math.ceil(totalElements / 20);
  return {
    content,
    page: pageNumber,
    size: 20,
    totalElements,
    totalPages,
    first: pageNumber === 0,
    last: !hasNext,
    hasNext,
    hasPrevious: pageNumber > 0,
  };
}
