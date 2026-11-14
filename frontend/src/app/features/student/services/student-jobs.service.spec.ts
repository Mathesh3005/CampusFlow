import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { apiInterceptor } from '../../../core/http/api.interceptor';
import { ApiError } from '../../../core/http/api-error.handler';
import { EmploymentType, JobResponse, JobStatus, PageResponse, WorkMode } from '../../../core/models/domain.models';
import { StudentJobsService } from './student-jobs.service';

describe('StudentJobsService', () => {
  let service: StudentJobsService;
  let requests: HttpTestingController;
  const root = environment.apiBaseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([apiInterceptor])), provideHttpClientTesting()],
    });
    service = TestBed.inject(StudentJobsService);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => requests.verify());

  it('sends only supported filters and Spring pagination/sort parameters', () => {
    let response: PageResponse<JobResponse> | undefined;
    service.listJobs({
      page: 2, size: 10, sort: 'createdAt,desc', location: 'New York',
      employmentType: EmploymentType.Internship, workMode: WorkMode.Remote,
    }).subscribe(value => response = value);

    const request = requests.expectOne(`${root}/student/jobs?page=2&size=10&sort=createdAt,desc&location=New%20York&employmentType=INTERNSHIP&workMode=REMOTE`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys().sort()).toEqual(['employmentType', 'location', 'page', 'size', 'sort', 'workMode']);
    request.flush(emptyPage<JobResponse>(2, 10));

    expect(response?.page).toBe(2);
    expect(response?.totalElements).toBe(21);
  });

  it('uses the supported default sort when listing jobs', () => {
    service.listJobs({ page: 0, size: 10 }).subscribe();
    requests.expectOne(`${root}/student/jobs?page=0&size=10&sort=createdAt,desc`).flush(emptyPage<JobResponse>(0, 10));
  });

  it('requests a student job detail by ID', () => {
    let response: JobResponse | undefined;
    service.getJob(42).subscribe(value => response = value);
    const request = requests.expectOne(`${root}/student/jobs/42`);
    expect(request.request.method).toBe('GET');
    request.flush(job(42));
    expect(response?.jobTitle).toBe('Graduate Engineer');
  });

  it('preserves the normalized API 404 error for missing or ineligible jobs', () => {
    let receivedError: unknown;
    service.getJob(404).subscribe({ error: error => receivedError = error });
    requests.expectOne(`${root}/student/jobs/404`).flush(
      { type: 'about:blank', title: 'Not Found', status: 404, detail: 'Job not found' },
      { status: 404, statusText: 'Not Found' },
    );

    expect(receivedError).toBeInstanceOf(ApiError);
    expect((receivedError as ApiError).status).toBe(404);
    expect((receivedError as ApiError).message).toBe('Job not found');
  });
});

function emptyPage<T>(pageNumber: number, size: number): PageResponse<T> {
  return {
    content: [], page: pageNumber, size, totalElements: 21, totalPages: 3,
    first: pageNumber === 0, last: pageNumber === 2, hasNext: pageNumber < 2, hasPrevious: pageNumber > 0,
  };
}

function job(id: number): JobResponse {
  return {
    id, createdById: 1, companyName: 'CampusFlow Inc.', jobTitle: 'Graduate Engineer',
    jobDescription: 'Build useful software.', location: 'Bengaluru', employmentType: EmploymentType.FullTime,
    workMode: WorkMode.Hybrid, minimumCgpa: 7.5, salaryMin: 700000, salaryMax: 900000,
    applicationDeadline: '2030-01-01T12:00:00Z', status: JobStatus.Published,
    createdAt: '2026-01-01T12:00:00Z', updatedAt: '2026-01-01T12:00:00Z',
  };
}
