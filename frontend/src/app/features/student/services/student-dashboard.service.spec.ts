import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { apiInterceptor } from '../../../core/http/api.interceptor';
import { InterviewDashboardSection } from '../models/dashboard.models';
import { ApplicationResponse, InterviewMode, InterviewResponse, InterviewStatus, JobResponse, NotificationResponse, PageResponse } from '../../../core/models/domain.models';
import { StudentDashboardService } from './student-dashboard.service';

describe('StudentDashboardService', () => {
  let service: StudentDashboardService;
  let requests: HttpTestingController;
  const root = environment.apiBaseUrl;
  const interviewsUrl = `${root}/student/interviews`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([apiInterceptor])), provideHttpClientTesting()],
    });
    service = TestBed.inject(StudentDashboardService);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => requests.verify());

  it('requests dashboard sections with bounded pages and ascending interview order', () => {
    let received = false;
    service.loadDashboard().subscribe(() => received = true);
    flushOtherSections();

    const interviewRequest = requests.expectOne(`${interviewsUrl}?page=0&size=20&sort=scheduledAt,asc`);
    expect(interviewRequest.request.method).toBe('GET');
    interviewRequest.flush(page([], 0));
    expect(received).toBe(true);
  });

  it('fetches subsequent pages sequentially to find upcoming interviews beyond page one', () => {
    let result: InterviewDashboardSection | undefined;
    service.loadDashboard().subscribe(data => result = data.interviews);
    flushOtherSections();

    requests.expectOne(`${interviewsUrl}?page=0&size=20&sort=scheduledAt,asc`)
      .flush(page(Array.from({ length: 20 }, (_, index) => interview(index + 1, '2020-01-01T00:00:00Z')), 40, 0, true));

    const secondPage = requests.expectOne(`${interviewsUrl}?page=1&size=20&sort=scheduledAt,asc`);
    expect(secondPage.request.method).toBe('GET');
    secondPage.flush(page([interview(30, futureDate(1))], 40, 1, false));

    expect(result?.interviews.map(item => item.id)).toEqual([30]);
    expect(result?.error).toBeNull();
    expect(result?.partialResults).toBe(false);
  });

  it('returns an empty upcoming list when no future scheduled interviews exist', () => {
    let result: InterviewDashboardSection | undefined;
    service.loadDashboard().subscribe(data => result = data.interviews);
    flushOtherSections();
    requests.expectOne(`${interviewsUrl}?page=0&size=20&sort=scheduledAt,asc`)
      .flush(page([interview(1, '2020-01-01T00:00:00Z'), interview(2, futureDate(1), InterviewStatus.Completed)], 2));
    expect(result).toEqual({ interviews: [], error: null, partialResults: false });
  });

  it('stops requesting pages once five upcoming interviews are found', () => {
    let result: InterviewDashboardSection | undefined;
    service.loadDashboard().subscribe(data => result = data.interviews);
    flushOtherSections();
    requests.expectOne(`${interviewsUrl}?page=0&size=20&sort=scheduledAt,asc`)
      .flush(page(Array.from({ length: 5 }, (_, index) => interview(index + 1, futureDate(index + 1))), 100, 0, true));

    expect(result?.interviews).toHaveLength(5);
    expect(result?.partialResults).toBe(false);
    requests.expectNone(`${interviewsUrl}?page=1&size=20&sort=scheduledAt,asc`);
  });

  it('stops after five pages and marks results as partial when more pages remain', () => {
    let result: InterviewDashboardSection | undefined;
    service.loadDashboard().subscribe(data => result = data.interviews);
    flushOtherSections();

    for (let pageNumber = 0; pageNumber < 5; pageNumber++) {
      const request = requests.expectOne(`${interviewsUrl}?page=${pageNumber}&size=20&sort=scheduledAt,asc`);
      request.flush(page(
        Array.from({ length: 20 }, (_, index) => interview(pageNumber * 20 + index + 1, '2020-01-01T00:00:00Z')),
        200,
        pageNumber,
        true,
      ));
    }

    expect(result).toEqual({ interviews: [], error: null, partialResults: true });
    requests.expectNone(`${interviewsUrl}?page=5&size=20&sort=scheduledAt,asc`);
  });

  it('keeps successful sections available when the interview endpoint fails', () => {
    let result: { applications: { page: PageResponse<ApplicationResponse> | null }; interviews: { error: string | null } } | undefined;
    service.loadDashboard().subscribe(data => result = data);
    requests.expectOne(`${root}/student/applications?page=0&size=5&sort=appliedAt,desc`).flush(page([], 8));
    requests.expectOne(`${root}/student/jobs?page=0&size=4&sort=createdAt,desc`).flush(page<JobResponse>([], 14));
    requests.expectOne(`${interviewsUrl}?page=0&size=20&sort=scheduledAt,asc`)
      .flush({ detail: 'Interview service unavailable' }, { status: 500, statusText: 'Server Error' });
    requests.expectOne(`${root}/student/notifications?page=0&size=5&sort=createdAt,desc`).flush(page<NotificationResponse>([], 3));

    expect(result?.applications.page?.totalElements).toBe(8);
    expect(result?.interviews.error).toContain('Interview service unavailable');
  });

  function flushOtherSections(): void {
    requests.expectOne(`${root}/student/applications?page=0&size=5&sort=appliedAt,desc`).flush(page<ApplicationResponse>([], 0));
    requests.expectOne(`${root}/student/jobs?page=0&size=4&sort=createdAt,desc`).flush(page<JobResponse>([], 0));
    requests.expectOne(`${root}/student/notifications?page=0&size=5&sort=createdAt,desc`).flush(page<NotificationResponse>([], 0));
  }
});

function page<T>(content: T[], totalElements = content.length, pageNumber = 0, hasNext = false): PageResponse<T> {
  return {
    content, page: pageNumber, size: 20, totalElements, totalPages: Math.ceil(totalElements / 20),
    first: pageNumber === 0, last: !hasNext, hasNext, hasPrevious: pageNumber > 0,
  };
}

function interview(id: number, scheduledAt: string, status = InterviewStatus.Scheduled): InterviewResponse {
  return {
    id, applicationId: id, scheduledAt, interviewMode: InterviewMode.Online,
    locationOrLink: '', status, notes: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  };
}

function futureDate(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}
