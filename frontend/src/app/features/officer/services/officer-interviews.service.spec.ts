import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { ApiError } from '../../../core/http/api-error.handler';
import { apiInterceptor } from '../../../core/http/api.interceptor';
import {
  InterviewMode,
  InterviewRequest,
  InterviewResponse,
  InterviewStatus,
  InterviewUpdateRequest,
  PageResponse,
} from '../../../core/models/domain.models';
import {
  OFFICER_INTERVIEWS_DEFAULT_SORT,
  OFFICER_INTERVIEWS_PAGE_SIZE,
  OfficerInterviewStatus,
  OfficerInterviewsService,
} from './officer-interviews.service';

describe('OfficerInterviewsService', () => {
  let service: OfficerInterviewsService;
  let requests: HttpTestingController;
  const root = environment.apiBaseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([apiInterceptor])), provideHttpClientTesting()],
    });
    service = TestBed.inject(OfficerInterviewsService);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => requests.verify());

  it('lists interviews using default pagination and sorting', () => {
    let response: PageResponse<InterviewResponse> | undefined;
    service.listInterviews().subscribe(value => response = value);

    const request = requests.expectOne(
      `${root}/officer/interviews?page=0&size=${OFFICER_INTERVIEWS_PAGE_SIZE}&sort=${OFFICER_INTERVIEWS_DEFAULT_SORT}`,
    );
    expect(request.request.method).toBe('GET');
    const result = page([interview()], 0, 1);
    request.flush(result);
    expect(response).toEqual(result);
  });

  it('forwards requested pagination and sorting', () => {
    service.listInterviews({ page: 3, size: 4, sort: 'scheduledAt,desc' }).subscribe();
    const request = requests.expectOne(`${root}/officer/interviews?page=3&size=4&sort=scheduledAt,desc`);
    expect(request.request.method).toBe('GET');
    request.flush(page([], 3, 0));
  });

  it('loads an interview by ID', () => {
    let response: InterviewResponse | undefined;
    service.getInterviewById(81).subscribe(value => response = value);
    const request = requests.expectOne(`${root}/officer/interviews/81`);
    expect(request.request.method).toBe('GET');
    request.flush(interview());
    expect(response).toEqual(interview());
  });

  it('posts the backend scheduling DTO', () => {
    const body: InterviewRequest = {
      applicationId: 37,
      scheduledAt: '2026-12-01T10:00:00Z',
      interviewMode: InterviewMode.Online,
      locationOrLink: 'https://meet.example.test/room',
      notes: 'Bring your portfolio.',
    };
    service.scheduleInterview(body).subscribe();
    const request = requests.expectOne(`${root}/officer/interviews`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush(interview(), { status: 201, statusText: 'Created' });
  });

  it('puts the backend interview update DTO', () => {
    const body: InterviewUpdateRequest = {
      scheduledAt: '2026-12-02T10:00:00Z',
      interviewMode: InterviewMode.Offline,
      locationOrLink: 'Room 12',
      notes: null,
    };
    service.updateInterview(81, body).subscribe();
    const request = requests.expectOne(`${root}/officer/interviews/81`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(body);
    request.flush({ ...interview(), ...body });
  });

  it.each<OfficerInterviewStatus>([InterviewStatus.Completed, InterviewStatus.Cancelled])(
    'patches interview status %s',
    status => {
      let response: InterviewResponse | undefined;
      service.updateInterviewStatus(81, status).subscribe(value => response = value);
      const request = requests.expectOne(`${root}/officer/interviews/81/status`);
      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual({ status });
      const updated = { ...interview(), status };
      request.flush(updated);
      expect(response).toEqual(updated);
    },
  );

  it('deletes an interview and handles the no-content response', () => {
    let completed = false;
    service.deleteInterview(81).subscribe(() => completed = true);
    const request = requests.expectOne(`${root}/officer/interviews/81`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(completed).toBe(true);
  });

  it.each([400, 401, 403, 404, 409])('propagates normalized HTTP %s errors', status => {
    let receivedError: unknown;
    service.updateInterviewStatus(81, InterviewStatus.Completed)
      .subscribe({ error: error => receivedError = error });
    requests.expectOne(`${root}/officer/interviews/81/status`).flush(
      { type: 'about:blank', title: 'Request failed', status, detail: 'Interview request failed' },
      { status, statusText: 'Request failed' },
    );
    expect(receivedError).toBeInstanceOf(ApiError);
    expect((receivedError as ApiError).status).toBe(status);
    expect((receivedError as ApiError).message).toBe('Interview request failed');
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
  const totalPages = Math.ceil(totalElements / OFFICER_INTERVIEWS_PAGE_SIZE);
  return {
    content,
    page: pageNumber,
    size: OFFICER_INTERVIEWS_PAGE_SIZE,
    totalElements,
    totalPages,
    first: pageNumber === 0,
    last: pageNumber >= totalPages - 1,
    hasNext: pageNumber < totalPages - 1,
    hasPrevious: pageNumber > 0,
  };
}
