import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { ApiError } from '../../../core/http/api-error.handler';
import { apiInterceptor } from '../../../core/http/api.interceptor';
import {
  ApplicationResponse,
  ApplicationStatus,
  PageResponse,
} from '../../../core/models/domain.models';
import {
  OFFICER_APPLICATIONS_DEFAULT_SORT,
  OFFICER_APPLICATIONS_PAGE_SIZE,
  OfficerApplicationsService,
} from './officer-applications.service';

describe('OfficerApplicationsService', () => {
  let service: OfficerApplicationsService;
  let requests: HttpTestingController;
  const root = environment.apiBaseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([apiInterceptor])), provideHttpClientTesting()],
    });
    service = TestBed.inject(OfficerApplicationsService);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => requests.verify());

  it('lists officer applications with the backend default pagination and sorting', () => {
    let response: PageResponse<ApplicationResponse> | undefined;
    service.listApplications().subscribe(value => response = value);

    const request = requests.expectOne(
      `${root}/officer/applications?page=0&size=${OFFICER_APPLICATIONS_PAGE_SIZE}&sort=${OFFICER_APPLICATIONS_DEFAULT_SORT}`,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys().sort()).toEqual(['page', 'size', 'sort']);
    const result = page([application()], 0, 1, 1);
    request.flush(result);

    expect(response).toEqual(result);
  });

  it('uses requested pagination values without adding unsupported filters', () => {
    service.listApplications({ page: 2, size: 5 }).subscribe();

    const request = requests.expectOne(
      `${root}/officer/applications?page=2&size=5&sort=${OFFICER_APPLICATIONS_DEFAULT_SORT}`,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys().sort()).toEqual(['page', 'size', 'sort']);
    request.flush(page([], 2, 0, 0));
  });

  it('gets an officer application by ID and returns the backend response fields', () => {
    let response: ApplicationResponse | undefined;
    service.getApplicationById(789).subscribe(value => response = value);

    const request = requests.expectOne(`${root}/officer/applications/789`);
    expect(request.request.method).toBe('GET');
    const result = application();
    request.flush(result);

    expect(response).toEqual(result);
    expect(response?.studentId).toBe(12);
  });

  it.each([
    [403, 'Forbidden'],
    [404, 'Not Found'],
  ])('propagates normalized HTTP %s when an officer application cannot be loaded', (status, title) => {
    let receivedError: unknown;
    service.getApplicationById(789).subscribe({ error: error => receivedError = error });

    requests.expectOne(`${root}/officer/applications/789`).flush(
      { type: 'about:blank', title, status, detail: `${title} application` },
      { status, statusText: title },
    );

    expect(receivedError).toBeInstanceOf(ApiError);
    expect((receivedError as ApiError).status).toBe(status);
    expect((receivedError as ApiError).message).toBe(`${title} application`);
  });

  it('patches the requested officer application status with the backend DTO shape', () => {
    let response: ApplicationResponse | undefined;
    service.updateApplicationStatus(789, ApplicationStatus.UnderReview).subscribe(value => response = value);

    const request = requests.expectOne(`${root}/officer/applications/789/status`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ status: ApplicationStatus.UnderReview });
    const updated = { ...application(), status: ApplicationStatus.UnderReview };
    request.flush(updated);

    expect(response).toEqual(updated);
  });

  it('propagates normalized conflict errors for invalid status transitions', () => {
    let receivedError: unknown;
    service.updateApplicationStatus(789, ApplicationStatus.Selected)
      .subscribe({ error: error => receivedError = error });

    requests.expectOne(`${root}/officer/applications/789/status`).flush(
      {
        type: 'about:blank',
        title: 'Conflict',
        status: 409,
        detail: 'Application status cannot transition from APPLIED to SELECTED',
      },
      { status: 409, statusText: 'Conflict' },
    );

    expect(receivedError).toBeInstanceOf(ApiError);
    expect((receivedError as ApiError).status).toBe(409);
    expect((receivedError as ApiError).message).toContain('cannot transition');
  });
});

function application(): ApplicationResponse {
  return {
    id: 789,
    studentId: 12,
    jobId: 123,
    resumeId: null,
    companyName: 'CampusFlow Labs',
    jobTitle: 'Graduate Engineer',
    coverLetter: 'A short note.',
    status: ApplicationStatus.Applied,
    appliedAt: '2026-11-14T10:00:00Z',
    updatedAt: '2026-11-14T10:00:00Z',
  };
}

function page<T>(
  content: T[],
  pageNumber: number,
  totalElements: number,
  totalPages: number,
): PageResponse<T> {
  return {
    content,
    page: pageNumber,
    size: OFFICER_APPLICATIONS_PAGE_SIZE,
    totalElements,
    totalPages,
    first: pageNumber === 0,
    last: pageNumber >= totalPages - 1,
    hasNext: pageNumber < totalPages - 1,
    hasPrevious: pageNumber > 0,
  };
}
