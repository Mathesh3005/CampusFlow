import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { EmploymentType, JobResponse, JobStatus, WorkMode } from '../../../../core/models/domain.models';
import { OfficerJobsService } from '../../services/officer-jobs.service';
import { OfficerJobDetails } from './job-details.component';
import { JobDeleteConfirmationDialog } from './job-delete-confirmation-dialog.component';
import { JobStatusConfirmationDialog } from './job-status-confirmation-dialog.component';

describe('OfficerJobDetails', () => {
  it('loads and displays the requested job details', () => {
    const getJobById = vi.fn(() => of(job()));
    const fixture = createFixture('42', getJobById);
    fixture.detectChanges();

    expect(getJobById).toHaveBeenCalledOnce();
    expect(getJobById).toHaveBeenCalledWith(42);

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('CampusFlow Labs');
    expect(text).toContain('Graduate Developer');
    expect(text).toContain('Build accessible software.');
    expect(text).toContain('Bengaluru');
    expect(text).toContain('FULL TIME');
    expect(text).toContain('HYBRID');
    expect(text).toContain('PUBLISHED');
    expect(text).toContain('700,000');
    expect(text).toContain('900,000');
    expect(text).toContain('7.5');
    expect(text).toContain('Application deadline');
    expect(text).toContain('Created');
  });

  it('shows loading while the details request is pending', () => {
    const response = new Subject<JobResponse>();
    const fixture = createFixture('42', vi.fn(() => response.asObservable()));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading job details');
  });

  it('rejects invalid IDs without making an API request', () => {
    const getJobById = vi.fn(() => of(job()));
    const fixture = createFixture('1e3', getJobById);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Invalid job link');
    expect(getJobById).not.toHaveBeenCalled();
  });

  it('shows the unavailable state for a backend 404', () => {
    const getJobById = vi.fn(() => throwError(() => new ApiError(
      404,
      'notFound',
      { status: 404, detail: 'Job not found' },
    )));
    const fixture = createFixture('42', getJobById);
    fixture.detectChanges();

    expect(getJobById).toHaveBeenCalledWith(42);
    expect(fixture.nativeElement.textContent).toContain('Job unavailable');
    expect(fixture.nativeElement.textContent).toContain('not available to your account');
  });

  it('shows other API errors and retries the same job', () => {
    const getJobById = vi.fn()
      .mockReturnValueOnce(throwError(() => new ApiError(
        500,
        'server',
        { status: 500, detail: 'Job service unavailable' },
      )))
      .mockReturnValueOnce(of(job()));
    const fixture = createFixture('42', getJobById);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Job service unavailable');
    fixture.nativeElement.querySelector('button.primary-button').click();
    fixture.detectChanges();

    expect(getJobById).toHaveBeenCalledTimes(2);
    expect(getJobById).toHaveBeenLastCalledWith(42);
    expect(fixture.nativeElement.textContent).toContain('Graduate Developer');
  });

  it('provides a back-to-jobs navigation link', () => {
    const fixture = createFixture('42', vi.fn(() => of(job())));
    fixture.detectChanges();

    const backLink = fixture.nativeElement.querySelector('.back-link') as HTMLAnchorElement;
    expect(backLink.textContent).toContain('Back to jobs');
    expect(backLink.getAttribute('href')).toBe('/officer/jobs');
  });

  it.each([
    [JobStatus.Draft, 'Publish', null, 'Delete'],
    [JobStatus.Published, null, 'Close', null],
    [JobStatus.Closed, null, null, null],
  ])('shows only valid actions for %s jobs', (status, publishAction, closeAction, deleteAction) => {
    const fixture = createFixture('42', vi.fn(() => of(job(status))));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.publish-button')?.textContent.trim() ?? null)
      .toBe(publishAction);
    expect(fixture.nativeElement.querySelector('.close-button')?.textContent.trim() ?? null)
      .toBe(closeAction);
    expect(fixture.nativeElement.querySelector('.delete-button')?.textContent.trim() ?? null)
      .toBe(deleteAction);
  });

  it('requires confirmation before publishing and updates the displayed status on success', () => {
    const publishJob = vi.fn(() => of(job(JobStatus.Published)));
    const fixture = createFixture('42', vi.fn(() => of(job(JobStatus.Draft))), {
      publishJob,
      confirmed: true,
    });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.publish-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.dialog.open).toHaveBeenCalledWith(
      JobStatusConfirmationDialog,
      expect.objectContaining({
        data: { action: 'publish', jobTitle: 'Graduate Developer', companyName: 'CampusFlow Labs' },
        role: 'alertdialog',
      }),
    );
    expect(publishJob).toHaveBeenCalledWith(42);
    expect(fixture.nativeElement.textContent).toContain('PUBLISHED');
    expect(fixture.nativeElement.textContent).toContain('Job published successfully.');
    expect(fixture.nativeElement.querySelector('.publish-button')).toBeNull();
    expect(fixture.nativeElement.querySelector('.close-button')).not.toBeNull();
  });

  it('does not close a job when confirmation is dismissed', () => {
    const closeJob = vi.fn(() => of(job(JobStatus.Closed)));
    const fixture = createFixture('42', vi.fn(() => of(job())), { closeJob });
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
    const getJobById = vi.fn(() => of(job(JobStatus.Draft)));
    const publishJob = vi.fn(() => throwError(() => new ApiError(status, 'other', { status })));
    const fixture = createFixture('42', getJobById, { publishJob, confirmed: true });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.publish-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(message);
    expect(getJobById).toHaveBeenCalledTimes(expectedLoads);
    expect(fixture.componentInstance.actionPending()).toBe(false);
  });

  it('prevents duplicate close requests while one is pending', () => {
    const pending = new Subject<JobResponse>();
    const closeJob = vi.fn(() => pending.asObservable());
    const fixture = createFixture('42', vi.fn(() => of(job())), { closeJob, confirmed: true });
    fixture.detectChanges();

    const closeButton = fixture.nativeElement.querySelector('.close-button') as HTMLButtonElement;
    closeButton.click();
    fixture.detectChanges();
    expect(closeJob).toHaveBeenCalledOnce();
    expect((fixture.nativeElement.querySelector('.close-button') as HTMLButtonElement).disabled).toBe(true);

    (fixture.nativeElement.querySelector('.close-button') as HTMLButtonElement).click();
    expect(closeJob).toHaveBeenCalledOnce();
    pending.next(job(JobStatus.Closed));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Job closed successfully.');
    expect(fixture.nativeElement.querySelector('.close-button')).toBeNull();
  });

  it('requires confirmation before deleting and navigates to the jobs list on success', () => {
    const deleteJob = vi.fn(() => of(void 0));
    const fixture = createFixture('42', vi.fn(() => of(job(JobStatus.Draft))), {
      deleteJob,
      confirmed: true,
    });
    const navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.delete-button') as HTMLButtonElement).click();

    expect(fixture.dialog.open).toHaveBeenCalledWith(
      JobDeleteConfirmationDialog,
      expect.objectContaining({
        data: { jobTitle: 'Graduate Developer', companyName: 'CampusFlow Labs' },
        role: 'alertdialog',
      }),
    );
    expect(deleteJob).toHaveBeenCalledWith(42);
    expect(navigateByUrl).toHaveBeenCalledWith('/officer/jobs');
  });

  it('does not delete a job when confirmation is dismissed', () => {
    const deleteJob = vi.fn(() => of(void 0));
    const fixture = createFixture('42', vi.fn(() => of(job(JobStatus.Draft))), { deleteJob });
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
    const getJobById = vi.fn(() => of(job(JobStatus.Draft)));
    const deleteJob = vi.fn(() => throwError(() => new ApiError(status, 'other', { status })));
    const fixture = createFixture('42', getJobById, { deleteJob, confirmed: true });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.delete-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(message);
    expect(getJobById).toHaveBeenCalledTimes(expectedLoads);
    expect(fixture.componentInstance.deletePending()).toBe(false);
  });

  it('prevents duplicate delete requests while deletion is pending', () => {
    const pending = new Subject<void>();
    const deleteJob = vi.fn(() => pending.asObservable());
    const fixture = createFixture('42', vi.fn(() => of(job(JobStatus.Draft))), {
      deleteJob,
      confirmed: true,
    });
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.delete-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(deleteJob).toHaveBeenCalledOnce();
    expect((fixture.nativeElement.querySelector('.delete-button') as HTMLButtonElement).disabled).toBe(true);

    (fixture.nativeElement.querySelector('.delete-button') as HTMLButtonElement).click();
    expect(deleteJob).toHaveBeenCalledOnce();
    pending.next();
    fixture.detectChanges();
  });
});

interface JobDetailsTestServices {
  publishJob?: (id: number) => Observable<JobResponse>;
  closeJob?: (id: number) => Observable<JobResponse>;
  deleteJob?: (id: number) => Observable<void>;
  confirmed?: boolean;
}

function createFixture(
  id: string,
  getJobById: ReturnType<typeof vi.fn>,
  overrides: JobDetailsTestServices = {},
) {
  const paramMap = convertToParamMap({ id });
  const dialog = {
    open: vi.fn(() => ({ afterClosed: () => of(overrides.confirmed ?? false) })),
  };
  TestBed.configureTestingModule({
    imports: [OfficerJobDetails],
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { paramMap: of(paramMap), snapshot: { paramMap } } },
      {
        provide: OfficerJobsService,
        useValue: {
          getJobById,
          publishJob: overrides.publishJob ?? vi.fn(() => of(job(JobStatus.Published))),
          closeJob: overrides.closeJob ?? vi.fn(() => of(job(JobStatus.Closed))),
          deleteJob: overrides.deleteJob ?? vi.fn(() => of(void 0)),
        },
      },
    ],
  });
  TestBed.overrideProvider(MatDialog, { useValue: dialog });
  return Object.assign(TestBed.createComponent(OfficerJobDetails), { dialog });
}

function job(status = JobStatus.Published): JobResponse {
  return {
    id: 42,
    createdById: 4,
    companyName: 'CampusFlow Labs',
    jobTitle: 'Graduate Developer',
    jobDescription: 'Build accessible software.',
    location: 'Bengaluru',
    employmentType: EmploymentType.FullTime,
    workMode: WorkMode.Hybrid,
    minimumCgpa: 7.5,
    salaryMin: 700000,
    salaryMax: 900000,
    applicationDeadline: '2030-01-01T12:00:00Z',
    status,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

describe('JobStatusConfirmationDialog', () => {
  it('closes with confirmation or cancellation and describes the requested action', () => {
    const dialogRef = { close: vi.fn() };
    TestBed.configureTestingModule({
      imports: [JobStatusConfirmationDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { action: 'close', jobTitle: 'Graduate Developer', companyName: 'CampusFlow Labs' } },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    });
    const fixture = TestBed.createComponent(JobStatusConfirmationDialog);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Close this job?');
    expect(fixture.nativeElement.textContent).toContain('Graduate Developer');
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    buttons[0].click();
    expect(dialogRef.close).toHaveBeenLastCalledWith(false);
    buttons[1].click();
    expect(dialogRef.close).toHaveBeenLastCalledWith(true);
  });
});

describe('JobDeleteConfirmationDialog', () => {
  it('shows the permanent-delete warning and closes with confirmation or cancellation', () => {
    const dialogRef = { close: vi.fn() };
    TestBed.configureTestingModule({
      imports: [JobDeleteConfirmationDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { jobTitle: 'Graduate Developer', companyName: 'CampusFlow Labs' } },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    });
    const fixture = TestBed.createComponent(JobDeleteConfirmationDialog);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('This action cannot be undone.');
    expect(fixture.nativeElement.textContent).toContain('Graduate Developer');
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    buttons[0].click();
    expect(dialogRef.close).toHaveBeenLastCalledWith(false);
    buttons[1].click();
    expect(dialogRef.close).toHaveBeenLastCalledWith(true);
  });
});
