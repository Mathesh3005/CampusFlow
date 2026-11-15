import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { ApiError } from '../../../core/http/api-error.handler';
import { apiInterceptor } from '../../../core/http/api.interceptor';
import { InterviewMode, InterviewResponse, InterviewStatus, PageResponse } from '../../../core/models/domain.models';
import { STUDENT_INTERVIEWS_DEFAULT_SORT, STUDENT_INTERVIEWS_PAGE_SIZE, StudentInterviewsService } from './student-interviews.service';

describe('StudentInterviewsService', () => {
  let service: StudentInterviewsService;
  let requests: HttpTestingController;
  const root = environment.apiBaseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([apiInterceptor])), provideHttpClientTesting()],
    });
    service = TestBed.inject(StudentInterviewsService);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => requests.verify());

  it('lists own interviews with backend pagination defaults', () => {
    let response: PageResponse<InterviewResponse> | undefined;
    service.listInterviews().subscribe(value => response = value);

    const request = requests.expectOne(
      `${root}/student/interviews?page=0&size=${STUDENT_INTERVIEWS_PAGE_SIZE}&sort=${STUDENT_INTERVIEWS_DEFAULT_SORT}`,
    );
    expect(request.request.method).toBe('GET');
    const result = page([interview()], 0, 1);
    request.flush(result);

    expect(response).toEqual(result);
  });

  it('forwards a requested page, page size and sort', () => {
    service.listInterviews({ page: 2, size: 7, sort: 'scheduledAt,desc' }).subscribe();

    const request = requests.expectOne(`${root}/student/interviews?page=2&size=7&sort=scheduledAt,desc`);
    expect(request.request.method).toBe('GET');
    request.flush(page([], 2, 0));
  });

  it('loads one interview by ID', () => {
    let response: InterviewResponse | undefined;
    service.getInterviewById(81).subscribe(value => response = value);

    const request = requests.expectOne(`${root}/student/interviews/81`);
    expect(request.request.method).toBe('GET');
    request.flush(interview());
    expect(response).toEqual(interview());
  });

  it.each([401, 403, 404])('preserves normalized HTTP %s errors', status => {
    let receivedError: unknown;
    service.getInterviewById(81).subscribe({ error: error => receivedError = error });

    requests.expectOne(`${root}/student/interviews/81`).flush(
      { type: 'about:blank', title: 'Request failed', status, detail: 'Interview unavailable' },
      { status, statusText: 'Request failed' },
    );

    expect(receivedError).toBeInstanceOf(ApiError);
    expect((receivedError as ApiError).status).toBe(status);
    expect((receivedError as ApiError).message).toBe('Interview unavailable');
  });
});

function interview(): InterviewResponse {
  return {
    id: 81,
    applicationId: 37,
    scheduledAt: '2026-12-01T10:00:00Z',
    interviewMode: InterviewMode.Online,
    locationOrLink: 'https://meet.example.test/room',
    status: InterviewStatus.Scheduled,
    notes: 'Bring your portfolio.',
    createdAt: '2026-11-15T10:00:00Z',
    updatedAt: '2026-11-15T10:00:00Z',
  };
}

function page<T>(content: T[], pageNumber: number, totalElements: number): PageResponse<T> {
  const totalPages = Math.ceil(totalElements / STUDENT_INTERVIEWS_PAGE_SIZE);
  return {
    content,
    page: pageNumber,
    size: STUDENT_INTERVIEWS_PAGE_SIZE,
    totalElements,
    totalPages,
    first: pageNumber === 0,
    last: pageNumber >= totalPages - 1,
    hasNext: pageNumber < totalPages - 1,
    hasPrevious: pageNumber > 0,
  };
}
