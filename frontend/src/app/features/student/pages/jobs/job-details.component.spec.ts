import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { ApplicationRequest, ApplicationResponse, ApplicationStatus, EmploymentType, JobResponse, JobStatus, WorkMode } from '../../../../core/models/domain.models';
import { StudentResume } from '../../models/student-resume.model';
import { StudentApplicationsService } from '../../services/student-applications.service';
import { StudentResumesService } from '../../services/student-resumes.service';
import { StudentJobsService } from '../../services/student-jobs.service';
import { StudentJobDetails } from './job-details.component';

interface DetailTestServices {
  getJob?: (jobId: number) => Observable<JobResponse>;
  listResumes?: () => Observable<StudentResume[]>;
  submitApplication?: (request: ApplicationRequest) => Observable<ApplicationResponse>;
}

describe('StudentJobDetails application flow', () => {
  it.each(['0x10', '1e3', '-1', '1.5', '', 'not-a-number', '0', '9007199254740992'])('rejects invalid route ID %s without making an API request', id => {
    const getJob = vi.fn(() => of(job()));
    const fixture = createFixture(id, { getJob });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Invalid job link');
    expect(getJob).not.toHaveBeenCalled();
  });

  it('renders job details and the backend CGPA requirement', () => {
    const getJob = vi.fn(() => of(job()));
    const fixture = createFixture('22', { getJob });
    fixture.detectChanges();

    expect(getJob).toHaveBeenCalledOnce();
    expect(getJob).toHaveBeenCalledWith(22);
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('CampusFlow Labs');
    expect(text).toContain('Graduate Developer');
    expect(text).toContain('Build accessible software.');
    expect(text).toContain('Bengaluru');
    expect(text).toContain('HYBRID');
    expect(text).toContain('Minimum CGPA: 7.5');
    expect(text).toContain('backend verifies eligibility');
    expect(text).toContain('UTC');
  });

  it('handles the backend 404 for jobs that are unavailable or ineligible', () => {
    const fixture = createFixture('22', {
      getJob: () => throwError(() => new ApiError(404, 'notFound', { status: 404, detail: 'Job not found' })),
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Job not available');
    expect(fixture.nativeElement.textContent).toContain('may not be available for your eligibility');
  });

  it('normalizes and displays multiple active resumes while allowing selection only among active ones', () => {
    const fixture = createFixture('22', {
      listResumes: () => of([
        studentResume(3, 'active-one.pdf', true),
        studentResume(4, 'active-two.pdf', true),
        studentResume(5, 'inactive.pdf', false),
      ]),
    });
    fixture.detectChanges();

    const radios = Array.from(fixture.nativeElement.querySelectorAll('.resume-option input')) as HTMLInputElement[];
    expect(fixture.nativeElement.textContent).toContain('active-one.pdf');
    expect(fixture.nativeElement.textContent).toContain('1 KB');
    expect(fixture.nativeElement.textContent).toContain('Uploaded');
    expect(radios).toHaveLength(3);
    expect(radios[0].disabled).toBe(false);
    expect(radios[1].disabled).toBe(false);
    expect(radios[2].disabled).toBe(true);

    radios[1].dispatchEvent(new Event('change', { bubbles: true }));
    expect(fixture.componentInstance.selectedResumeId()).toBe(4);
  });

  it('submits without resumeId when no resume is selected and shows the created application link', () => {
    const submitApplication = vi.fn(() => of(application()));
    const fixture = createFixture('22', { submitApplication });
    fixture.detectChanges();

    fixture.componentInstance.coverLetter.setValue('Interested in this role.');
    fixture.componentInstance.submitApplication(job());
    fixture.detectChanges();

    expect(submitApplication).toHaveBeenCalledWith({ jobId: 22, coverLetter: 'Interested in this role.' });
    expect(fixture.nativeElement.textContent).toContain('Application #789');
    expect(fixture.nativeElement.textContent).toContain('Status: APPLIED');
    expect(fixture.nativeElement.querySelector('a[href="/student/applications/789"]')).toBeTruthy();
  });

  it('includes the explicitly selected active resume ID in the request', () => {
    const submitApplication = vi.fn(() => of(application()));
    const fixture = createFixture('22', {
      listResumes: () => of([studentResume(44, 'active.pdf', true)]),
      submitApplication,
    });
    fixture.detectChanges();
    fixture.componentInstance.selectResume(44);
    fixture.componentInstance.submitApplication(job());

    expect(submitApplication).toHaveBeenCalledWith({ jobId: 22, resumeId: 44 });
  });

  it.each([
    [409, 'You have already applied for this job', 'You have already applied for this job.'],
    [403, 'You do not meet the minimum CGPA requirement', 'backend could not approve this application based on eligibility'],
    [409, 'Application deadline has passed', 'application deadline has passed'],
  ])('shows actionable feedback for backend status %s', (status, detail, expectedMessage) => {
    const fixture = createFixture('22', {
      submitApplication: () => throwError(() => new ApiError(status, status === 403 ? 'forbidden' : 'conflict', { status, detail })),
    });
    fixture.detectChanges();
    fixture.componentInstance.submitApplication(job());
    fixture.detectChanges();

    expect((fixture.nativeElement.textContent as string).toLowerCase()).toContain(expectedMessage.toLowerCase());
  });

  it('prevents repeated submits while a request is pending', () => {
    const pendingResponse = new Subject<ApplicationResponse>();
    const submitApplication = vi.fn(() => pendingResponse.asObservable());
    const fixture = createFixture('22', { submitApplication });
    fixture.detectChanges();

    fixture.componentInstance.submitApplication(job());
    fixture.componentInstance.submitApplication(job());
    fixture.detectChanges();

    expect(submitApplication).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.submitting()).toBe(true);
    expect((fixture.nativeElement.querySelector('.submit-application') as HTMLButtonElement).disabled).toBe(true);
  });

});

function createFixture(id: string, services: DetailTestServices = {}) {
  TestBed.configureTestingModule({
    imports: [StudentJobDetails],
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id })) } },
      { provide: StudentJobsService, useValue: { getJob: services.getJob ?? (() => of(job())) } },
      { provide: StudentResumesService, useValue: { listResumes: services.listResumes ?? (() => of([])) } },
      { provide: StudentApplicationsService, useValue: { submitApplication: services.submitApplication ?? (() => of(application())) } },
    ],
  });
  return TestBed.createComponent(StudentJobDetails);
}

function job(): JobResponse {
  return {
    id: 22, createdById: 4, companyName: 'CampusFlow Labs', jobTitle: 'Graduate Developer',
    jobDescription: 'Build accessible software.', location: 'Bengaluru', employmentType: EmploymentType.FullTime,
    workMode: WorkMode.Hybrid, minimumCgpa: 7.5, salaryMin: 700000, salaryMax: 900000,
    applicationDeadline: '2030-01-01T12:00:00Z', status: JobStatus.Published,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  };
}

function studentResume(id: number, fileName: string, isActive: boolean): StudentResume {
  return { id, studentId: 12, fileName, fileSize: 1024, contentType: 'application/pdf', isActive, uploadedAt: '2026-11-14T10:00:00Z' };
}

function application(): ApplicationResponse {
  return {
    id: 789, studentId: 12, jobId: 22, resumeId: null, companyName: 'CampusFlow Labs',
    jobTitle: 'Graduate Developer', coverLetter: null, status: ApplicationStatus.Applied,
    appliedAt: '2026-11-14T10:00:00Z', updatedAt: '2026-11-14T10:00:00Z',
  };
}
