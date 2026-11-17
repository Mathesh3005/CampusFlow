import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import {
  ApplicationResponse,
  ApplicationStatus,
  InterviewMode,
  InterviewResponse,
  InterviewStatus,
  NotificationResponse,
  NotificationType,
} from '../../../../core/models/domain.models';
import {
  OfficerApplicationsOverview,
  OfficerDashboardService,
  OfficerJobsOverview,
  OfficerUpcomingInterviews,
} from '../../services/officer-dashboard.service';
import { OfficerDashboard } from './officer-dashboard.component';

describe('OfficerDashboard', () => {
  it('starts independent widget requests and shows their loading states', () => {
    const jobs = new Subject<OfficerJobsOverview>();
    const applications = new Subject<OfficerApplicationsOverview>();
    const interviews = new Subject<OfficerUpcomingInterviews>();
    const notifications = new Subject<NotificationResponse[]>();
    const service = createService({
      loadJobsOverview: vi.fn(() => jobs.asObservable()),
      loadApplicationsOverview: vi.fn(() => applications.asObservable()),
      loadUpcomingInterviews: vi.fn(() => interviews.asObservable()),
      loadRecentNotifications: vi.fn(() => notifications.asObservable()),
    });
    const fixture = createFixture(service);
    fixture.detectChanges();

    expect(service.loadJobsOverview).toHaveBeenCalledOnce();
    expect(service.loadApplicationsOverview).toHaveBeenCalledOnce();
    expect(service.loadUpcomingInterviews).toHaveBeenCalledOnce();
    expect(service.loadRecentNotifications).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('Loading applications');
    expect(fixture.nativeElement.textContent).toContain('Loading interviews');
    expect(fixture.nativeElement.textContent).toContain('Loading notifications');
    expect(fixture.nativeElement.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThanOrEqual(3);
    expect((fixture.nativeElement.querySelector('.page-heading button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders exact totals, recent data, unread notifications, upcoming interviews and quick actions', () => {
    const fixture = createFixture(createService({
      loadJobsOverview: vi.fn(() => of({
        totalJobs: 17,
        statusTotals: { published: 12, draft: 3, closed: 2 },
      })),
      loadApplicationsOverview: vi.fn(() => of({
        totalApplications: 26,
        statusTotals: { awaitingReview: 4, shortlisted: 2, selected: 1 },
        recentApplications: [application()],
      })),
      loadUpcomingInterviews: vi.fn(() => of({
        interviews: [interview()],
        upcomingTotal: null,
        partialResults: false,
        warning: null,
      })),
      loadRecentNotifications: vi.fn(() => of([notification()])),
    }));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(metricValue(fixture, 'Total jobs')).toBe('17');
    expect(metricValue(fixture, 'Total applications')).toBe('26');
    expect(metricValue(fixture, 'Published jobs')).toBe('12');
    expect(metricValue(fixture, 'Upcoming interviews')).toBe('Unavailable');
    expect(text).toContain('Student One');
    expect(text).toContain('Graduate Engineer');
    expect(text).toContain('Northwind');
    expect(text).toContain('SHORTLISTED');
    expect(text).toContain('View application 8');
    expect(text).toContain('Interview #81');
    expect(text).toContain('Application #37');
    expect(text).toContain('ONLINE');
    expect(text).toContain('Interview scheduled');
    expect(text).toContain('Unread');
    expect(fixture.nativeElement.querySelector('a[href="/officer/applications/8"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/officer/interviews/81"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/officer/notifications/6"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.quick-actions a')).toHaveLength(5);
    expect(fixture.nativeElement.querySelector('a[href="/officer/jobs/new"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/officer/jobs"]')).not.toBeNull();
  });

  it('shows empty states and exact zero totals when there is no data', () => {
    const fixture = createFixture(createService());
    fixture.detectChanges();

    expect(metricValue(fixture, 'Total jobs')).toBe('0');
    expect(metricValue(fixture, 'Published jobs')).toBe('0');
    expect(metricValue(fixture, 'Total applications')).toBe('0');
    expect(metricValue(fixture, 'Shortlisted')).toBe('0');
    expect(metricValue(fixture, 'Upcoming interviews')).toBe('0');
    expect(fixture.nativeElement.textContent).toContain('No applications yet');
    expect(fixture.nativeElement.textContent).toContain('No upcoming interviews found');
    expect(fixture.nativeElement.textContent).toContain('No notifications yet');
  });

  it('keeps successful panels available and retries only a failed widget', () => {
    const loadApplicationsOverview = vi.fn()
      .mockReturnValueOnce(throwError(() => new ApiError(403, 'forbidden', { status: 403 })))
      .mockReturnValueOnce(of({
        totalApplications: 1,
        statusTotals: { awaitingReview: 1, shortlisted: 0, selected: 0 },
        recentApplications: [application()],
      }));
    const fixture = createFixture(createService({ loadApplicationsOverview }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('You do not have permission');
    expect(fixture.nativeElement.textContent).toContain('No upcoming interviews found');
    expect(fixture.nativeElement.querySelector('.page-error')).toBeNull();
    (fixture.nativeElement.querySelector('#applications-heading + p') as HTMLParagraphElement | null);
    const applicationPanel = fixture.nativeElement.querySelector('#applications-heading')?.closest('section');
    (applicationPanel?.querySelector('.section-error button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(loadApplicationsOverview).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('Graduate Engineer');
    expect(fixture.nativeElement.textContent).toContain('No notifications yet');
  });

  it('shows a complete-failure state and handles common HTTP errors explicitly', () => {
    const service = createService({
      loadJobsOverview: vi.fn(() => throwError(() => new ApiError(401, 'unauthorized', { status: 401 }))),
      loadApplicationsOverview: vi.fn(() => throwError(() => new ApiError(400, 'validation', { status: 400 }))),
      loadUpcomingInterviews: vi.fn(() => throwError(() => new ApiError(404, 'notFound', { status: 404 }))),
      loadRecentNotifications: vi.fn(() => throwError(() => new ApiError(409, 'conflict', { status: 409 }))),
    });
    const fixture = createFixture(service);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Dashboard data is unavailable');
    expect(text).toContain('Your session has expired');
    expect(text).toContain('The dashboard request was invalid');
    expect(text).toContain('could not be found');
    expect(text).toContain('may have changed');
    (fixture.nativeElement.querySelector('.page-error button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(service.loadJobsOverview).toHaveBeenCalledTimes(2);
  });

  it('explains bounded interview results and keeps the recent preview visible after a page error', () => {
    const fixture = createFixture(createService({
      loadUpcomingInterviews: vi.fn(() => of({
        interviews: [interview()],
        upcomingTotal: null,
        partialResults: true,
        warning: 'The next interview page could not be loaded.',
      })),
    }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Showing a bounded preview');
    expect(fixture.nativeElement.textContent).toContain('The next interview page could not be loaded.');
    expect(fixture.nativeElement.querySelector('a[href="/officer/interviews/81"]')).not.toBeNull();
  });

  it('surfaces a bounded-scan error even when no upcoming interview was found', () => {
    const fixture = createFixture(createService({
      loadUpcomingInterviews: vi.fn(() => of({
        interviews: [],
        upcomingTotal: null,
        partialResults: true,
        warning: 'The next interview page could not be loaded.',
      })),
    }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No upcoming interviews found');
    expect(fixture.nativeElement.textContent).toContain('The next interview page could not be loaded.');
  });

  it('ignores stale requests after a dashboard refresh', () => {
    const oldResponse = new Subject<OfficerJobsOverview>();
    const newResponse = new Subject<OfficerJobsOverview>();
    const loadJobsOverview = vi.fn()
      .mockReturnValueOnce(oldResponse.asObservable())
      .mockReturnValueOnce(newResponse.asObservable());
    const fixture = createFixture(createService({ loadJobsOverview }));
    fixture.detectChanges();
    fixture.componentInstance.load();
    oldResponse.next({ totalJobs: 99, statusTotals: { published: 90, draft: 5, closed: 4 } });
    newResponse.next({ totalJobs: 12, statusTotals: { published: 8, draft: 2, closed: 2 } });
    fixture.detectChanges();

    expect(loadJobsOverview).toHaveBeenCalledTimes(2);
    expect(metricValue(fixture, 'Total jobs')).toBe('12');
  });
});

function createFixture(service: Partial<OfficerDashboardService> = {}) {
  TestBed.configureTestingModule({
    imports: [OfficerDashboard],
    providers: [
      provideRouter([]),
      { provide: OfficerDashboardService, useValue: createService(service) },
    ],
  });
  return TestBed.createComponent(OfficerDashboard);
}

function createService(overrides: Partial<OfficerDashboardService> = {}) {
  return {
    loadJobsOverview: vi.fn(() => of({
      totalJobs: 0,
      statusTotals: { published: 0, draft: 0, closed: 0 },
    })),
    loadApplicationsOverview: vi.fn(() => of({
      totalApplications: 0,
      statusTotals: { awaitingReview: 0, shortlisted: 0, selected: 0 },
      recentApplications: [],
    })),
    loadUpcomingInterviews: vi.fn(() => of({
      interviews: [],
      upcomingTotal: 0,
      partialResults: false,
      warning: null,
    })),
    loadRecentNotifications: vi.fn(() => of([])),
    ...overrides,
  };
}

function metricValue(fixture: ReturnType<typeof createFixture>, label: string): string {
  const cards = Array.from(fixture.nativeElement.querySelectorAll('.metric-card')) as HTMLElement[];
  const card = cards.find(candidate => candidate.querySelector('.metric-label')?.textContent?.trim() === label);
  return card?.querySelector('strong')?.textContent?.trim() ?? '';
}

function application(): ApplicationResponse {
  return {
    id: 8,
    studentId: 108,
    studentName: 'Student One',
    studentRegisterNumber: 'REG-108',
    studentDepartment: 'Computer Science',
    studentCgpa: 8.5,
    jobId: 3,
    resumeId: null,
    resumeFileName: null,
    companyName: 'Northwind',
    jobTitle: 'Graduate Engineer',
    coverLetter: null,
    status: ApplicationStatus.Shortlisted,
    appliedAt: '2026-10-10T12:00:00Z',
    updatedAt: '2026-10-11T12:00:00Z',
  };
}

function interview(): InterviewResponse {
  return {
    id: 81,
    applicationId: 37,
    scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
    interviewMode: InterviewMode.Online,
    locationOrLink: 'https://meet.example.test/room',
    status: InterviewStatus.Scheduled,
    notes: null,
    createdAt: '2026-10-11T12:00:00Z',
    updatedAt: '2026-10-11T12:00:00Z',
  };
}

function notification(): NotificationResponse {
  return {
    id: 6,
    userId: 4,
    title: 'Interview scheduled',
    message: 'A new interview has been scheduled.',
    notificationType: NotificationType.Interview,
    isRead: false,
    createdAt: '2026-10-11T12:00:00Z',
  };
}
