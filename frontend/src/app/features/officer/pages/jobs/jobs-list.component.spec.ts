import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { EmploymentType, JobResponse, JobStatus, PageResponse, WorkMode } from '../../../../core/models/domain.models';
import { OFFICER_JOBS_DEFAULT_SORT, OFFICER_JOBS_PAGE_SIZE, OfficerJobsQuery, OfficerJobsService } from '../../services/officer-jobs.service';
import { OfficerJobsList } from './jobs-list.component';
import { JobDeleteConfirmationDialog } from './job-delete-confirmation-dialog.component';
import { JobStatusConfirmationDialog } from './job-status-confirmation-dialog.component';

describe('OfficerJobsList', () => {
  it('shows loading and then renders jobs and totalElements', () => {
    const response = new Subject<PageResponse<JobResponse>>();
    const listJobs = vi.fn(() => response.asObservable());
    const fixture = createFixture(listJobs);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading jobs');
    expect(listJobs).toHaveBeenCalledWith({
      page: 0,
      size: OFFICER_JOBS_PAGE_SIZE,
      sort: OFFICER_JOBS_DEFAULT_SORT,
    });

    response.next(page([job()], 0, 21, 2));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Job Management');
    expect(text).toContain('Manage and monitor your placement opportunities.');
    expect(text).toContain('21');
    expect(text).toContain('Graduate Engineer');
    expect(text).toContain('CampusFlow Inc.');
    expect(text).toContain('Bengaluru');
    expect(text).toContain('FULL TIME');
    expect(text).toContain('HYBRID');
    expect(text).toContain('PUBLISHED');
    expect(text).toContain('Application deadline');
    expect(text).toContain('Created');
  });

  it('shows an empty state for an empty page', () => {
    const fixture = createFixture(vi.fn(() => of(page([], 0, 0, 0))));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No jobs to display');
    expect(fixture.nativeElement.textContent).not.toContain('Graduate Engineer');
  });

  it('shows an API error and retries the current page', () => {
    const listJobs = vi.fn()
      .mockReturnValueOnce(throwError(() => new ApiError(500, 'server', { status: 500, detail: 'Jobs unavailable' })))
      .mockReturnValueOnce(of(page([job()], 0, 1, 1)));
    const fixture = createFixture(listJobs);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Jobs unavailable');
    fixture.nativeElement.querySelector('button.primary-button').click();
    fixture.detectChanges();

    expect(listJobs).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('Graduate Engineer');
  });

  it('requests the next page and ignores a stale in-flight response', () => {
    const firstResponse = new Subject<PageResponse<JobResponse>>();
    const secondResponse = new Subject<PageResponse<JobResponse>>();
    const listJobs = vi.fn((query: OfficerJobsQuery) => query.page === 0
      ? firstResponse.asObservable()
      : secondResponse.asObservable());
    const fixture = createFixture(listJobs);
    fixture.detectChanges();
    firstResponse.next(page([job()], 0, 21, 2));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button[aria-label="Next page"]').click();
    fixture.detectChanges();

    expect(listJobs).toHaveBeenLastCalledWith({
      page: 1,
      size: OFFICER_JOBS_PAGE_SIZE,
      sort: OFFICER_JOBS_DEFAULT_SORT,
    });
    expect(fixture.nativeElement.textContent).toContain('Loading jobs');

    firstResponse.next(page([job(99, 'Stale response')], 0, 21, 2));
    secondResponse.next(page([job(13, 'Current page job')], 1, 21, 2));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Current page job');
    expect(fixture.nativeElement.textContent).not.toContain('Stale response');
    expect(fixture.nativeElement.textContent).toContain('Page 2 of 2');
  });

  it('refreshes the current page', () => {
    const listJobs = vi.fn((query: OfficerJobsQuery) => of(page([job()], query.page ?? 0, 21, 2)));
    const fixture = createFixture(listJobs);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button[aria-label="Next page"]').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button:not([aria-label])').click();
    fixture.detectChanges();

    expect(listJobs).toHaveBeenLastCalledWith({
      page: 1,
      size: OFFICER_JOBS_PAGE_SIZE,
      sort: OFFICER_JOBS_DEFAULT_SORT,
    });
  });

  it('shows Publish and Delete only for drafts and Close only for published jobs', () => {
    const fixture = createFixture(
      vi.fn(() => of(page([
        job(1, 'Draft job', JobStatus.Draft),
        job(2, 'Published job', JobStatus.Published),
        job(3, 'Closed job', JobStatus.Closed),
      ], 0, 3, 1))),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.publish-button[data-job-id="1"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.delete-button[data-job-id="1"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.close-button[data-job-id="2"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.publish-button[data-job-id="2"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.delete-button[data-job-id="2"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.close-button[data-job-id="1"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-job-id="3"]')).toBeNull();
  });

  it('confirms publishing and updates the list row with the successful response', () => {
    const publishJob = vi.fn(() => of(job(12, 'Graduate Engineer', JobStatus.Published)));
    const fixture = createFixture(
      vi.fn(() => of(page([job(12, 'Graduate Engineer', JobStatus.Draft)], 0, 1, 1))),
      { publishJob, confirmed: true },
    );
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.publish-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.dialog.open).toHaveBeenCalledWith(
      JobStatusConfirmationDialog,
      expect.objectContaining({
        data: { action: 'publish', jobTitle: 'Graduate Engineer', companyName: 'CampusFlow Inc.' },
        role: 'alertdialog',
      }),
    );
    expect(publishJob).toHaveBeenCalledWith(12);
    expect(fixture.nativeElement.textContent).toContain('Job published successfully.');
    expect(fixture.nativeElement.textContent).toContain('PUBLISHED');
    expect(fixture.nativeElement.querySelector('.publish-button')).toBeNull();
    expect(fixture.nativeElement.querySelector('.close-button')).not.toBeNull();
  });

  it('does not close a job when confirmation is dismissed', () => {
    const closeJob = vi.fn(() => of(job(12, 'Graduate Engineer', JobStatus.Closed)));
    const fixture = createFixture(
      vi.fn(() => of(page([job(12, 'Graduate Engineer', JobStatus.Published)], 0, 1, 1))),
      { closeJob },
    );
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.close-button') as HTMLButtonElement).click();

    expect(fixture.dialog.open).toHaveBeenCalledOnce();
    expect(closeJob).not.toHaveBeenCalled();
  });

  it.each([
    [400, 'This job cannot be published', 1],
    [403, 'You do not have permission', 1],
    [404, 'This job could not be found', 2],
    [409, 'The job status changed', 2],
    [500, 'The server could not update this job', 1],
  ])('handles publish HTTP %s and refreshes after stale job errors', (status, message, expectedLoads) => {
    const listJobs = vi.fn(() => of(page([job(12, 'Graduate Engineer', JobStatus.Draft)], 0, 1, 1)));
    const publishJob = vi.fn(() => throwError(() => new ApiError(status, 'other', { status })));
    const fixture = createFixture(listJobs, { publishJob, confirmed: true });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.publish-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(message);
    expect(listJobs).toHaveBeenCalledTimes(expectedLoads);
    expect(fixture.componentInstance.actingOnJobId()).toBeNull();
  });

  it('prevents duplicate close requests while one is pending', () => {
    const pending = new Subject<JobResponse>();
    const closeJob = vi.fn(() => pending.asObservable());
    const fixture = createFixture(
      vi.fn(() => of(page([job(12, 'Graduate Engineer', JobStatus.Published)], 0, 1, 1))),
      { closeJob, confirmed: true },
    );
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.close-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(closeJob).toHaveBeenCalledOnce();
    expect((fixture.nativeElement.querySelector('.close-button') as HTMLButtonElement).disabled).toBe(true);

    (fixture.nativeElement.querySelector('.close-button') as HTMLButtonElement).click();
    expect(closeJob).toHaveBeenCalledOnce();
    pending.next(job(12, 'Graduate Engineer', JobStatus.Closed));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Job closed successfully.');
    expect(fixture.nativeElement.querySelector('.close-button')).toBeNull();
  });

  it('confirms deletion, removes the job, and updates the total count', () => {
    const deleteJob = vi.fn(() => of(void 0));
    const listJobs = vi.fn(() => of(page([
      job(12, 'Draft job', JobStatus.Draft),
      job(13, 'Published job', JobStatus.Published),
    ], 0, 2, 1)));
    const fixture = createFixture(listJobs, { deleteJob, confirmed: true });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.delete-button[data-job-id="12"]') as HTMLButtonElement).click();

    expect(fixture.dialog.open).toHaveBeenCalledWith(
      JobDeleteConfirmationDialog,
      expect.objectContaining({
        data: { jobTitle: 'Draft job', companyName: 'CampusFlow Inc.' },
        role: 'alertdialog',
      }),
    );
    expect(deleteJob).toHaveBeenCalledWith(12);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Job deleted successfully.');
    expect(fixture.nativeElement.textContent).toContain('Published job');
    expect(fixture.nativeElement.textContent).not.toContain('Draft job');
    expect(fixture.nativeElement.querySelector('.total-jobs strong').textContent).toBe('1');
  });

  it('loads the previous page when deleting the last job on the current last page', () => {
    const listJobs = vi.fn((query: OfficerJobsQuery) => query.page === 0
      ? of(page([job(1, 'Previous page job')], 0, 20, 1))
      : of(page([job(21, 'Last page draft', JobStatus.Draft)], 1, 21, 2)));
    const fixture = createFixture(listJobs, {
      deleteJob: vi.fn(() => of(void 0)),
      confirmed: true,
    });
    fixture.componentInstance.pageIndex.set(1);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.delete-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.pageIndex()).toBe(0);
    expect(listJobs).toHaveBeenCalledTimes(2);
    expect(listJobs).toHaveBeenLastCalledWith({
      page: 0,
      size: OFFICER_JOBS_PAGE_SIZE,
      sort: OFFICER_JOBS_DEFAULT_SORT,
    });
    expect(fixture.nativeElement.textContent).toContain('Previous page job');
    expect(fixture.nativeElement.textContent).toContain('Page 1 of 1');
    expect(fixture.nativeElement.textContent).toContain('20');
  });

  it('does not delete when the confirmation dialog is dismissed', () => {
    const deleteJob = vi.fn(() => of(void 0));
    const fixture = createFixture(
      vi.fn(() => of(page([job(12, 'Draft job', JobStatus.Draft)], 0, 1, 1))),
      { deleteJob },
    );
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.delete-button') as HTMLButtonElement).click();

    expect(fixture.dialog.open).toHaveBeenCalledOnce();
    expect(deleteJob).not.toHaveBeenCalled();
  });

  it.each([
    [403, 'You do not have permission to delete', 1],
    [404, 'This job could not be found', 2],
    [409, 'This job is no longer a draft', 2],
    [500, 'The server could not delete this job', 1],
  ])('handles delete HTTP %s and refreshes after stale job errors', (status, message, expectedLoads) => {
    const listJobs = vi.fn(() => of(page([job(12, 'Draft job', JobStatus.Draft)], 0, 1, 1)));
    const deleteJob = vi.fn(() => throwError(() => new ApiError(status, 'other', { status })));
    const fixture = createFixture(listJobs, { deleteJob, confirmed: true });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.delete-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(message);
    expect(listJobs).toHaveBeenCalledTimes(expectedLoads);
    expect(fixture.componentInstance.deletingJobId()).toBeNull();
  });

  it('prevents duplicate deletion requests while one is pending', () => {
    const pending = new Subject<void>();
    const deleteJob = vi.fn(() => pending.asObservable());
    const fixture = createFixture(
      vi.fn(() => of(page([job(12, 'Draft job', JobStatus.Draft)], 0, 1, 1))),
      { deleteJob, confirmed: true },
    );
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.delete-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(deleteJob).toHaveBeenCalledOnce();
    expect((fixture.nativeElement.querySelector('.delete-button') as HTMLButtonElement).disabled).toBe(true);

    (fixture.nativeElement.querySelector('.delete-button') as HTMLButtonElement).click();
    expect(deleteJob).toHaveBeenCalledOnce();
    pending.next();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Job deleted successfully.');
    expect(fixture.nativeElement.querySelector('.delete-button')).toBeNull();
  });
});

interface JobsListTestServices {
  publishJob?: (id: number) => Observable<JobResponse>;
  closeJob?: (id: number) => Observable<JobResponse>;
  deleteJob?: (id: number) => Observable<void>;
  confirmed?: boolean;
}

function createFixture(listJobs: ReturnType<typeof vi.fn>, overrides: JobsListTestServices = {}) {
  const dialog = {
    open: vi.fn(() => ({ afterClosed: () => of(overrides.confirmed ?? false) })),
  };
  TestBed.configureTestingModule({
    imports: [OfficerJobsList],
    providers: [{
      provide: OfficerJobsService,
      useValue: {
        listJobs,
        publishJob: overrides.publishJob ?? vi.fn(() => of(job())),
        closeJob: overrides.closeJob ?? vi.fn(() => of(job())),
        deleteJob: overrides.deleteJob ?? vi.fn(() => of(void 0)),
      },
    }],
  });
  TestBed.overrideProvider(MatDialog, { useValue: dialog });
  return Object.assign(TestBed.createComponent(OfficerJobsList), { dialog });
}

function page<T>(content: T[], pageNumber: number, totalElements: number, totalPages: number): PageResponse<T> {
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

function job(id = 12, jobTitle = 'Graduate Engineer', status = JobStatus.Published): JobResponse {
  return {
    id,
    createdById: 4,
    companyName: 'CampusFlow Inc.',
    jobTitle,
    jobDescription: 'Build useful software.',
    location: 'Bengaluru',
    employmentType: EmploymentType.FullTime,
    workMode: WorkMode.Hybrid,
    minimumCgpa: 7.5,
    salaryMin: 700000,
    salaryMax: 900000,
    applicationDeadline: '2030-01-01T12:00:00Z',
    status,
    createdAt: '2026-01-01T12:00:00Z',
    updatedAt: '2026-01-01T12:00:00Z',
  };
}
