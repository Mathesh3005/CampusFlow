import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { ApiError } from '../../../core/http/api-error.handler';
import { apiInterceptor } from '../../../core/http/api.interceptor';
import { EmploymentType, JobRequest, JobResponse, JobStatus, PageResponse, WorkMode } from '../../../core/models/domain.models';
import { OFFICER_JOBS_DEFAULT_SORT, OFFICER_JOBS_PAGE_SIZE, OfficerJobsService } from './officer-jobs.service';

describe('OfficerJobsService', () => {
  let service: OfficerJobsService;
  let requests: HttpTestingController;
  const root = environment.apiBaseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([apiInterceptor])), provideHttpClientTesting()],
    });
    service = TestBed.inject(OfficerJobsService);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => requests.verify());

  it('gets the officer jobs endpoint with default pagination and sorting', () => {
    let response: PageResponse<JobResponse> | undefined;
    service.listJobs().subscribe(value => response = value);

    const request = requests.expectOne(
      `${root}/officer/jobs?page=0&size=${OFFICER_JOBS_PAGE_SIZE}&sort=${OFFICER_JOBS_DEFAULT_SORT}`,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys().sort()).toEqual(['page', 'size', 'sort']);
    request.flush(page([job()], 0, 1));

    expect(response?.content[0]).toEqual(job());
    expect(response?.totalElements).toBe(1);
  });

  it('sends the requested page, size, and sort without unsupported filters', () => {
    service.listJobs({ page: 2, size: 5, sort: 'jobTitle,asc' }).subscribe();

    const request = requests.expectOne(`${root}/officer/jobs?page=2&size=5&sort=jobTitle,asc`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys().sort()).toEqual(['page', 'size', 'sort']);
    request.flush(page([], 2, 0));
  });

  it('gets an officer job by ID and returns its response', () => {
    let response: JobResponse | undefined;
    service.getJobById(42).subscribe(value => response = value);

    const request = requests.expectOne(`${root}/officer/jobs/42`);
    expect(request.request.method).toBe('GET');
    request.flush(job(42));

    expect(response).toEqual(job(42));
  });

  it('propagates the normalized API error when a job cannot be loaded', () => {
    let receivedError: unknown;
    service.getJobById(404).subscribe({ error: error => receivedError = error });

    requests.expectOne(`${root}/officer/jobs/404`).flush(
      { type: 'about:blank', title: 'Not Found', status: 404, detail: 'Job not found' },
      { status: 404, statusText: 'Not Found' },
    );

    expect(receivedError).toBeInstanceOf(ApiError);
    expect((receivedError as ApiError).status).toBe(404);
    expect((receivedError as ApiError).message).toBe('Job not found');
  });

  it('posts the job request to the officer jobs endpoint', () => {
    const requestBody = jobRequest();
    service.createJob(requestBody).subscribe();

    const request = requests.expectOne(`${root}/officer/jobs`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(requestBody);
    request.flush({ ...job(), status: JobStatus.Draft });
  });

  it('returns the created draft job response', () => {
    let response: JobResponse | undefined;
    const createdJob = { ...job(), status: JobStatus.Draft };
    service.createJob(jobRequest()).subscribe(value => response = value);

    requests.expectOne(`${root}/officer/jobs`).flush(createdJob);

    expect(response).toEqual(createdJob);
    expect(response?.status).toBe(JobStatus.Draft);
  });

  it('propagates the normalized API error when job creation fails', () => {
    let receivedError: unknown;
    service.createJob(jobRequest()).subscribe({ error: error => receivedError = error });

    requests.expectOne(`${root}/officer/jobs`).flush(
      { type: 'about:blank', title: 'Bad Request', status: 400, detail: 'Invalid job details' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(receivedError).toBeInstanceOf(ApiError);
    expect((receivedError as ApiError).status).toBe(400);
    expect((receivedError as ApiError).message).toBe('Invalid job details');
  });

  it('puts the job request to the officer jobs endpoint for the requested ID', () => {
    const requestBody = jobRequest();
    service.updateJob(42, requestBody).subscribe();

    const request = requests.expectOne(`${root}/officer/jobs/42`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(requestBody);
    request.flush({ ...job(42), status: JobStatus.Draft });
  });

  it('returns the updated job response', () => {
    let response: JobResponse | undefined;
    const updatedJob = { ...job(42), jobTitle: 'Updated Graduate Engineer' };
    service.updateJob(42, jobRequest()).subscribe(value => response = value);

    requests.expectOne(`${root}/officer/jobs/42`).flush(updatedJob);

    expect(response).toEqual(updatedJob);
  });

  it('propagates the normalized API error for an uneditable job', () => {
    let receivedError: unknown;
    service.updateJob(42, jobRequest()).subscribe({ error: error => receivedError = error });

    requests.expectOne(`${root}/officer/jobs/42`).flush(
      { type: 'about:blank', title: 'Conflict', status: 409, detail: 'Closed jobs cannot be updated' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(receivedError).toBeInstanceOf(ApiError);
    expect((receivedError as ApiError).status).toBe(409);
    expect((receivedError as ApiError).message).toBe('Closed jobs cannot be updated');
  });

  it('patches the publish endpoint for the requested job ID without a request body', () => {
    let response: JobResponse | undefined;
    service.publishJob(42).subscribe(value => response = value);

    const request = requests.expectOne(`${root}/officer/jobs/42/publish`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toBeNull();
    const publishedJob = { ...job(42), status: JobStatus.Published };
    request.flush(publishedJob);

    expect(response).toEqual(publishedJob);
  });

  it('propagates the normalized API error when publishing a job fails', () => {
    let receivedError: unknown;
    service.publishJob(42).subscribe({ error: error => receivedError = error });

    requests.expectOne(`${root}/officer/jobs/42/publish`).flush(
      { type: 'about:blank', title: 'Conflict', status: 409, detail: 'Only draft jobs can be published' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(receivedError).toBeInstanceOf(ApiError);
    expect((receivedError as ApiError).status).toBe(409);
    expect((receivedError as ApiError).message).toBe('Only draft jobs can be published');
  });

  it('patches the close endpoint for the requested job ID without a request body', () => {
    let response: JobResponse | undefined;
    service.closeJob(42).subscribe(value => response = value);

    const request = requests.expectOne(`${root}/officer/jobs/42/close`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toBeNull();
    const closedJob = { ...job(42), status: JobStatus.Closed };
    request.flush(closedJob);

    expect(response).toEqual(closedJob);
  });

  it('propagates the normalized API error when closing a job fails', () => {
    let receivedError: unknown;
    service.closeJob(42).subscribe({ error: error => receivedError = error });

    requests.expectOne(`${root}/officer/jobs/42/close`).flush(
      { type: 'about:blank', title: 'Conflict', status: 409, detail: 'Job is already closed' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(receivedError).toBeInstanceOf(ApiError);
    expect((receivedError as ApiError).status).toBe(409);
    expect((receivedError as ApiError).message).toBe('Job is already closed');
  });

  it('deletes the requested officer job and completes with the backend no-content response', () => {
    let completed = false;
    service.deleteJob(42).subscribe(() => completed = true);

    const request = requests.expectOne(`${root}/officer/jobs/42`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(completed).toBe(true);
  });

  it.each([
    [403, 'Forbidden', 'Job is managed by another placement officer'],
    [404, 'Not Found', 'Job not found'],
    [409, 'Conflict', 'Only draft jobs can be deleted'],
  ])('propagates normalized HTTP %s when deleting an officer job fails', (status, title, detail) => {
    let receivedError: unknown;
    service.deleteJob(42).subscribe({ error: error => receivedError = error });

    const request = requests.expectOne(`${root}/officer/jobs/42`);
    expect(request.request.method).toBe('DELETE');
    request.flush(
      { type: 'about:blank', title, status, detail },
      { status, statusText: title },
    );

    expect(receivedError).toBeInstanceOf(ApiError);
    expect((receivedError as ApiError).status).toBe(status);
    expect((receivedError as ApiError).message).toBe(detail);
  });
});

function page<T>(content: T[], pageNumber: number, totalElements: number): PageResponse<T> {
  const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / OFFICER_JOBS_PAGE_SIZE);
  return {
    content,
    page: pageNumber,
    size: OFFICER_JOBS_PAGE_SIZE,
    totalElements,
    totalPages,
    first: pageNumber === 0,
    last: pageNumber >= totalPages - 1,
    hasNext: pageNumber < totalPages - 1,
    hasPrevious: pageNumber > 0,
  };
}

function job(id = 12): JobResponse {
  return {
    id,
    createdById: 4,
    companyName: 'CampusFlow Inc.',
    jobTitle: 'Graduate Engineer',
    jobDescription: 'Build useful software.',
    location: 'Bengaluru',
    employmentType: EmploymentType.FullTime,
    workMode: WorkMode.Hybrid,
    minimumCgpa: 7.5,
    salaryMin: 700000,
    salaryMax: 900000,
    applicationDeadline: '2030-01-01T12:00:00Z',
    status: JobStatus.Published,
    createdAt: '2026-01-01T12:00:00Z',
    updatedAt: '2026-01-01T12:00:00Z',
  };
}

function jobRequest(): JobRequest {
  return {
    companyName: 'CampusFlow Inc.',
    jobTitle: 'Graduate Engineer',
    jobDescription: 'Build useful software.',
    location: 'Bengaluru',
    employmentType: EmploymentType.FullTime,
    workMode: WorkMode.Hybrid,
    minimumCgpa: 7.5,
    salaryMin: 700000,
    salaryMax: 900000,
    applicationDeadline: '2030-01-01T12:00:00Z',
  };
}
