import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { ApplicationResponse, ApplicationStatus } from '../../../../core/models/domain.models';
import { StudentApplicationsService } from '../../services/student-applications.service';
import { StudentApplicationDetails } from './application-details.component';

describe('StudentApplicationDetails', () => {
  it('loads and renders the submitted application response', () => {
    const getApplication = vi.fn(() => of(application()));
    const fixture = createFixture('789', getApplication);
    fixture.detectChanges();

    expect(getApplication).toHaveBeenCalledWith(789);
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Graduate Developer');
    expect(text).toContain('CampusFlow Labs');
    expect(text).toContain('APPLIED');
    expect(text).toContain('UTC');
  });

  it('shows a not-found state for the backend student-scoped 404', () => {
    const fixture = createFixture('789', () => throwError(() => new ApiError(404, 'notFound', { status: 404, detail: 'Application not found: 789' })));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Application not found');
  });

  it('shows a session-expired message and a sign-in link for HTTP 401', () => {
    const fixture = createFixture('789', () => throwError(() => new ApiError(401, 'unauthorized', { status: 401 })));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Your session has expired');
    const signInLink = fixture.nativeElement.querySelector('a[href="/login"]') as HTMLAnchorElement | null;
    expect(signInLink).not.toBeNull();
    expect(signInLink?.textContent).toContain('Sign in');
  });

  it('keeps the generic error state for other API failures', () => {
    const fixture = createFixture('789', () => throwError(() => new ApiError(500, 'server', { status: 500 })));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Could not load application');
    expect(fixture.nativeElement.textContent).toContain('Please try again later');
  });
});

function createFixture(id: string, getApplication: StudentApplicationsService['getApplication']) {
  TestBed.configureTestingModule({
    imports: [StudentApplicationDetails],
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id })) } },
      { provide: StudentApplicationsService, useValue: { getApplication } },
    ],
  });
  return TestBed.createComponent(StudentApplicationDetails);
}

function application(): ApplicationResponse {
  return {
    id: 789, studentId: 12, jobId: 22, resumeId: 44, companyName: 'CampusFlow Labs',
    jobTitle: 'Graduate Developer', coverLetter: 'A short note.', status: ApplicationStatus.Applied,
    appliedAt: '2026-11-14T10:00:00Z', updatedAt: '2026-11-14T10:00:00Z',
  };
}
