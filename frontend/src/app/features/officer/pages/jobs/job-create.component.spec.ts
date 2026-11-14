import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router, provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { EmploymentType, JobRequest, JobResponse, JobStatus, WorkMode } from '../../../../core/models/domain.models';
import { OfficerJobsService } from '../../services/officer-jobs.service';
import { OfficerJobCreate } from './job-create.component';

interface JobServiceOverrides {
  getJobById?: (id: number) => Observable<JobResponse>;
  updateJob?: (id: number, request: JobRequest) => Observable<JobResponse>;
}

describe('OfficerJobCreate', () => {
  it('renders the backend-supported job fields', () => {
    const fixture = createFixture();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Create a job');
    expect(text).toContain('Job title');
    expect(text).toContain('Company');
    expect(text).toContain('Description');
    expect(text).toContain('Location');
    expect(text).toContain('Employment type');
    expect(text).toContain('Work mode');
    expect(text).toContain('Minimum salary');
    expect(text).toContain('Maximum salary');
    expect(text).toContain('Minimum CGPA');
    expect(text).toContain('Application deadline');
    expect(text).toContain('saved as a draft');
  });

  it('shows required-field validation and does not submit an empty form', () => {
    const createJob = vi.fn(() => of(draftJob()));
    const fixture = createFixture(createJob);
    fixture.detectChanges();

    fixture.componentInstance.onSubmit();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Job title is required.');
    expect(text).toContain('Company is required.');
    expect(text).toContain('Job description is required.');
    expect(text).toContain('Employment type is required.');
    expect(text).toContain('Work mode is required.');
    expect(text).toContain('Application deadline is required.');
    expect(createJob).not.toHaveBeenCalled();
  });

  it('rejects invalid lengths, numeric bounds, salary ranges, and past deadlines', () => {
    const createJob = vi.fn(() => of(draftJob()));
    const fixture = createFixture(createJob);
    fixture.detectChanges();
    fillValidForm(fixture.componentInstance);
    fixture.componentInstance.form.controls.jobTitle.setValue('x'.repeat(151));
    fixture.componentInstance.form.controls.minimumCgpa.setValue(10.1);
    fixture.componentInstance.form.controls.salaryMin.setValue(-1);
    fixture.componentInstance.form.controls.salaryMax.setValue(-2);
    fixture.componentInstance.form.controls.applicationDeadline.setValue('2000-01-01T10:00');
    expect(fixture.componentInstance.form.invalid).toBe(true);
    fixture.componentInstance.onSubmit();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Job title must be 150 characters or fewer.');
    expect(text).toContain('Minimum CGPA must be between 0 and 10.');
    expect(text).toContain('Salary must be zero or greater.');
    expect(text).toContain('Maximum salary must be greater than or equal to minimum salary.');
    expect(text).toContain('Application deadline must be in the future.');
    expect(createJob).not.toHaveBeenCalled();
  });

  it('creates a draft with the existing job request contract', () => {
    const createJob = vi.fn(() => of(draftJob()));
    const fixture = createFixture(createJob);
    fixture.detectChanges();
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const deadline = futureDeadline();
    fillValidForm(fixture.componentInstance, deadline);

    fixture.componentInstance.onSubmit();

    const expected: JobRequest = {
      companyName: 'CampusFlow Labs',
      jobTitle: 'Graduate Developer',
      jobDescription: 'Build accessible software.',
      location: 'Bengaluru',
      employmentType: EmploymentType.FullTime,
      workMode: WorkMode.Hybrid,
      salaryMin: 700000,
      salaryMax: 900000,
      minimumCgpa: 7.5,
      applicationDeadline: new Date(deadline).toISOString(),
    };
    expect(createJob).toHaveBeenCalledWith(expected);
    expect(fixture.componentInstance.submitting()).toBe(false);
  });

  it('prevents duplicate submissions while the create request is pending', () => {
    const pending = new Subject<JobResponse>();
    const createJob = vi.fn(() => pending.asObservable());
    const fixture = createFixture(createJob);
    fixture.detectChanges();
    fillValidForm(fixture.componentInstance);
    expect(fixture.componentInstance.form.valid).toBe(true);

    fixture.componentInstance.onSubmit();
    fixture.componentInstance.onSubmit();
    fixture.detectChanges();

    expect(createJob).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.submitting()).toBe(true);
    expect((fixture.nativeElement.querySelector('.submit-button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('displays API errors and keeps the form available for retry', () => {
    const createJob = vi.fn(() => throwError(() => new ApiError(
      400,
      'validation',
      { status: 400, detail: 'Application deadline must be in the future' },
    )));
    const fixture = createFixture(createJob);
    fixture.detectChanges();
    fillValidForm(fixture.componentInstance);
    expect(fixture.componentInstance.form.valid).toBe(true);

    fixture.componentInstance.onSubmit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Draft not saved');
    expect(fixture.nativeElement.textContent).toContain('Application deadline must be in the future');
    expect(fixture.nativeElement.querySelector('.submit-button')).not.toBeNull();
    expect(fixture.componentInstance.submitting()).toBe(false);
  });

  it('navigates to the created job details page after success', () => {
    const fixture = createFixture(vi.fn(() => of(draftJob(42))));
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateByUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fillValidForm(fixture.componentInstance);

    fixture.componentInstance.onSubmit();

    expect(navigateByUrl).toHaveBeenCalledWith('/officer/jobs/42');
  });

  it('loads an existing job and populates the shared form', () => {
    const response = new Subject<JobResponse>();
    const job = draftJob(42);
    const getJobById = vi.fn(() => response.asObservable());
    const updateJob = vi.fn(() => of(draftJob(42)));
    const fixture = createFixture(undefined, '42', { getJobById, updateJob });
    fixture.detectChanges();

    expect(getJobById).toHaveBeenCalledWith(42);
    expect(fixture.componentInstance.loadState()).toBe('loading');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    fixture.componentInstance.onSubmit();
    expect(updateJob).not.toHaveBeenCalled();

    response.next(job);
    fixture.detectChanges();

    expect(fixture.componentInstance.loadState()).toBe('ready');
    expect(fixture.componentInstance.isEditMode()).toBe(true);
    expect(fixture.componentInstance.form.controls.jobTitle.value).toBe('Graduate Developer');
    expect(fixture.componentInstance.form.controls.companyName.value).toBe('CampusFlow Labs');
    expect(fixture.componentInstance.form.controls.jobDescription.value).toBe('Build accessible software.');
    expect(fixture.componentInstance.form.controls.location.value).toBe('Bengaluru');
    expect(fixture.componentInstance.form.controls.employmentType.value).toBe(EmploymentType.FullTime);
    expect(fixture.componentInstance.form.controls.workMode.value).toBe(WorkMode.Hybrid);
    expect(fixture.componentInstance.form.controls.salaryMin.value).toBe(700000);
    expect(fixture.componentInstance.form.controls.salaryMax.value).toBe(900000);
    expect(fixture.componentInstance.form.controls.minimumCgpa.value).toBe(7.5);
    const expectedDeadline = new Date(job.applicationDeadline);
    expectedDeadline.setSeconds(0, 0);
    expect(new Date(fixture.componentInstance.form.controls.applicationDeadline.value).toISOString())
      .toBe(expectedDeadline.toISOString());
    expect(fixture.nativeElement.textContent).toContain('Edit job');
  });

  it('rejects invalid edit IDs without making an API request', () => {
    const getJobById = vi.fn(() => of(draftJob()));
    const fixture = createFixture(undefined, '1e3', { getJobById });
    fixture.detectChanges();

    expect(fixture.componentInstance.loadState()).toBe('invalid');
    expect(fixture.nativeElement.textContent).toContain('Invalid job link');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(getJobById).not.toHaveBeenCalled();
  });

  it('shows not-found state when the existing job returns 404', () => {
    const getJobById = vi.fn(() => throwError(() => new ApiError(
      404,
      'notFound',
      { status: 404, detail: 'Job not found' },
    )));
    const fixture = createFixture(undefined, '42', { getJobById });
    fixture.detectChanges();

    expect(fixture.componentInstance.loadState()).toBe('notFound');
    expect(fixture.nativeElement.textContent).toContain('Job not found');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('shows load errors and can retry loading the job', () => {
    const getJobById = vi.fn()
      .mockReturnValueOnce(throwError(() => new ApiError(
        500,
        'server',
        { status: 500, detail: 'Job service unavailable' },
      )))
      .mockReturnValueOnce(of(draftJob(42)));
    const fixture = createFixture(undefined, '42', { getJobById });
    fixture.detectChanges();

    expect(fixture.componentInstance.loadState()).toBe('error');
    expect(fixture.nativeElement.textContent).toContain('Job service unavailable');
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(getJobById).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.form.controls.jobTitle.value).toBe('Graduate Developer');
    expect(fixture.nativeElement.textContent).toContain('Edit job');
  });

  it('prevents editing a closed job', () => {
    const updateJob = vi.fn(() => of(draftJob(42)));
    const fixture = createFixture(undefined, '42', {
      getJobById: vi.fn(() => of({ ...draftJob(42), status: JobStatus.Closed })),
      updateJob,
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.loadState()).toBe('closed');
    expect(fixture.nativeElement.textContent).toContain('Closed jobs cannot be updated.');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    fixture.componentInstance.onSubmit();
    expect(updateJob).not.toHaveBeenCalled();
  });

  it('updates the loaded job and navigates to its details page', () => {
    const existingJob = draftJob(42);
    const updatedJob = { ...existingJob, jobTitle: 'Updated Graduate Developer' };
    const createJob = vi.fn(() => of(draftJob()));
    const updateJob = vi.fn(() => of(updatedJob));
    const fixture = createFixture(createJob, '42', {
      getJobById: vi.fn(() => of(existingJob)),
      updateJob,
    });
    const router = TestBed.inject(Router);
    const navigateByUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture.detectChanges();
    fixture.componentInstance.form.controls.jobTitle.setValue(updatedJob.jobTitle);

    fixture.componentInstance.onSubmit();

    expect(updateJob).toHaveBeenCalledWith(42, {
      companyName: existingJob.companyName,
      jobTitle: updatedJob.jobTitle,
      jobDescription: existingJob.jobDescription,
      location: existingJob.location,
      employmentType: existingJob.employmentType,
      workMode: existingJob.workMode,
      salaryMin: existingJob.salaryMin,
      salaryMax: existingJob.salaryMax,
      minimumCgpa: existingJob.minimumCgpa,
      applicationDeadline: new Date(
        fixture.componentInstance.form.controls.applicationDeadline.value,
      ).toISOString(),
    });
    expect(createJob).not.toHaveBeenCalled();
    expect(navigateByUrl).toHaveBeenCalledWith('/officer/jobs/42');
    expect(fixture.componentInstance.successMessage()).toBe('Job updated successfully.');
  });

  it('displays update conflicts without navigating away', () => {
    const updateJob = vi.fn(() => throwError(() => new ApiError(
      409,
      'conflict',
      { status: 409, detail: 'Closed jobs cannot be updated' },
    )));
    const fixture = createFixture(undefined, '42', {
      getJobById: vi.fn(() => of(draftJob(42))),
      updateJob,
    });
    const navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.detectChanges();
    fillValidForm(fixture.componentInstance);

    fixture.componentInstance.onSubmit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Changes not saved');
    expect(fixture.nativeElement.textContent).toContain('Closed jobs cannot be updated');
    expect(navigateByUrl).not.toHaveBeenCalled();
  });
});

function createFixture(
  createJob = vi.fn(() => of(draftJob())),
  routeId: string | null = null,
  overrides: JobServiceOverrides = {},
) {
  const paramMap = convertToParamMap(routeId === null ? {} : { id: routeId });
  TestBed.configureTestingModule({
    imports: [OfficerJobCreate],
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { paramMap: of(paramMap), snapshot: { paramMap } } },
      {
        provide: OfficerJobsService,
        useValue: {
          createJob,
          getJobById: overrides.getJobById ?? vi.fn((id: number) => of(draftJob(id))),
          updateJob: overrides.updateJob ?? vi.fn((id: number) => of(draftJob(id))),
        },
      },
    ],
  });
  return TestBed.createComponent(OfficerJobCreate);
}

function fillValidForm(component: OfficerJobCreate, applicationDeadline = futureDeadline()): void {
  component.form.setValue({
    jobTitle: 'Graduate Developer',
    companyName: 'CampusFlow Labs',
    jobDescription: 'Build accessible software.',
    location: 'Bengaluru',
    employmentType: EmploymentType.FullTime,
    workMode: WorkMode.Hybrid,
    salaryMin: 700000,
    salaryMax: 900000,
    minimumCgpa: 7.5,
    applicationDeadline,
  });
}

function futureDeadline(): string {
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const local = new Date(future.getTime() - future.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function draftJob(id = 12): JobResponse {
  return {
    id,
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
    applicationDeadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    status: JobStatus.Draft,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}
