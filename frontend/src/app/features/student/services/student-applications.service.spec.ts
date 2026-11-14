import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { apiInterceptor } from '../../../core/http/api.interceptor';
import { ApiError } from '../../../core/http/api-error.handler';
import { ApplicationRequest, ApplicationResponse, ApplicationStatus, PageResponse } from '../../../core/models/domain.models';
import { StudentApplicationsService } from './student-applications.service';

describe('StudentApplicationsService', () => {
  let service: StudentApplicationsService;
  let requests: HttpTestingController;
  const root = environment.apiBaseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([apiInterceptor])), provideHttpClientTesting()],
    });
    service = TestBed.inject(StudentApplicationsService);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => requests.verify());

  it('submits without a resume when resumeId is omitted and accepts the created application response', () => {
    const requestBody: ApplicationRequest = { jobId: 123, coverLetter: 'A short note.' };
    let response: ApplicationResponse | undefined;
    service.submitApplication(requestBody).subscribe(value => response = value);
    const request = requests.expectOne(`${root}/student/applications`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ jobId: 123, coverLetter: 'A short note.' });
    request.flush(application(), { status: 201, statusText: 'Created' });
    expect(response?.id).toBe(789);
    expect(response?.status).toBe(ApplicationStatus.Applied);
  });

  it('sends the explicitly selected resume ID when supplied', () => {
    service.submitApplication({ jobId: 123, resumeId: 45 }).subscribe();
    const request = requests.expectOne(`${root}/student/applications`);
    expect(request.request.body).toEqual({ jobId: 123, resumeId: 45 });
    request.flush(application());
  });

  it('preserves normalized duplicate-application ProblemDetail errors', () => {
    let receivedError: unknown;
    service.submitApplication({ jobId: 123 }).subscribe({ error: error => receivedError = error });
    requests.expectOne(`${root}/student/applications`).flush(
      { type: 'about:blank', title: 'Conflict', status: 409, detail: 'You have already applied for this job' },
      { status: 409, statusText: 'Conflict' },
    );
    expect(receivedError).toBeInstanceOf(ApiError);
    expect((receivedError as ApiError).status).toBe(409);
    expect((receivedError as ApiError).problem?.detail).toContain('already applied');
  });

  it('loads an application by the student detail endpoint', () => {
    let response: ApplicationResponse | undefined;
    service.getApplication(789).subscribe(value => response = value);
    const request = requests.expectOne(`${root}/student/applications/789`);
    expect(request.request.method).toBe('GET');
    request.flush(application());
    expect(response?.jobTitle).toBe('Graduate Engineer');
  });

  it('lists student applications with server pagination and newest-first ordering', () => {
    let response: PageResponse<ApplicationResponse> | undefined;
    service.listApplications(2).subscribe(value => response = value);
    const request = requests.expectOne(`${root}/student/applications?page=2&size=20&sort=appliedAt,desc`);
    expect(request.request.method).toBe('GET');
    request.flush(applicationPage(2));
    expect(response?.content[0].id).toBe(789);
    expect(response?.page).toBe(2);
  });

  it('withdraws an application with PATCH and returns the updated DTO', () => {
    let response: ApplicationResponse | undefined;
    service.withdrawApplication(789).subscribe(value => response = value);
    const request = requests.expectOne(`${root}/student/applications/789/withdraw`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toBeNull();
    request.flush({ ...application(), status: ApplicationStatus.Withdrawn });
    expect(response?.status).toBe(ApplicationStatus.Withdrawn);
  });

  it.each([
    [401, 'Unauthorized'],
    [404, 'Not Found'],
    [409, 'Conflict'],
  ])('preserves normalized withdrawal HTTP %s errors', (status, title) => {
    let receivedError: unknown;
    service.withdrawApplication(789).subscribe({ error: error => receivedError = error });
    requests.expectOne(`${root}/student/applications/789/withdraw`).flush(
      { type: 'about:blank', title, status, detail: `${title} detail` },
      { status, statusText: title },
    );
    expect(receivedError).toBeInstanceOf(ApiError);
    expect((receivedError as ApiError).status).toBe(status);
  });
});

function application(): ApplicationResponse {
  return {
    id: 789, studentId: 12, jobId: 123, resumeId: null, companyName: 'Example Company',
    jobTitle: 'Graduate Engineer', coverLetter: 'A short note.', status: ApplicationStatus.Applied,
    appliedAt: '2026-11-14T10:00:00Z', updatedAt: '2026-11-14T10:00:00Z',
  };
}

function applicationPage(pageNumber: number): PageResponse<ApplicationResponse> {
  return {
    content: [application()], page: pageNumber, size: 20, totalElements: 41, totalPages: 3,
    first: pageNumber === 0, last: pageNumber === 2, hasNext: pageNumber < 2, hasPrevious: pageNumber > 0,
  };
}
