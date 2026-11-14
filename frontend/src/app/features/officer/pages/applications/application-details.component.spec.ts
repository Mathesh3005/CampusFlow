import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { ApplicationResponse, ApplicationStatus } from '../../../../core/models/domain.models';
import { OfficerApplicationsService } from '../../services/officer-applications.service';
import { OfficerApplicationDetails } from './application-details.component';

describe('OfficerApplicationDetails', () => {
  it('loads the requested application and renders only available response details', () => {
    const getApplicationById = vi.fn(() => of(application()));
    const fixture = createFixture('42', getApplicationById);
    fixture.detectChanges();

    expect(getApplicationById).toHaveBeenCalledOnce();
    expect(getApplicationById).toHaveBeenCalledWith(42);

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Application #42');
    expect(text).toContain('Application ID');
    expect(text).toContain('Student ID');
    expect(text).toContain('735');
    expect(text).toContain('Job ID');
    expect(text).toContain('902');
    expect(text).toContain('UNDER REVIEW');
    expect(text).toContain('Applied');
    expect(text).toContain('Resume ID');
    expect(text).toContain('18');
    expect(text).toContain('Cover letter');
    expect(text).toContain('I am interested in this role.');
    expect(text).not.toContain('Student Name');
    expect(text).not.toContain('Graduate Engineer');
    expect(text).toContain('Status review actions are not available yet.');
  });

  it('shows loading while the details request is pending', () => {
    const response = new Subject<ApplicationResponse>();
    const fixture = createFixture('42', vi.fn(() => response.asObservable()));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading application details');
    expect(fixture.nativeElement.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it.each(['abc', '1e3', '0', '-2', '9007199254740992'])(
    'rejects invalid ID %s without making an API request',
    id => {
      const getApplicationById = vi.fn(() => of(application()));
      const fixture = createFixture(id, getApplicationById);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Invalid application link');
      expect(getApplicationById).not.toHaveBeenCalled();
    },
  );

  it.each([
    [401, 'Sign-in required', 'Your session has expired'],
    [403, 'Application unavailable', 'You do not have permission'],
    [404, 'Application unavailable', 'not found or is not available'],
    [500, 'Could not load application', 'The server could not load this application'],
  ])('handles application details HTTP %s', (status, heading, message) => {
    const getApplicationById = vi.fn(() => throwError(() => new ApiError(
      status,
      'server',
      { status, detail: 'Untrusted server detail' },
    )));
    const fixture = createFixture('42', getApplicationById);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(heading);
    expect(fixture.nativeElement.textContent).toContain(message);
    expect(fixture.nativeElement.textContent).not.toContain('Untrusted server detail');
  });

  it('retries a server error for the same application ID', () => {
    const getApplicationById = vi.fn()
      .mockReturnValueOnce(throwError(() => new ApiError(503, 'server', { status: 503 })))
      .mockReturnValueOnce(of(application()));
    const fixture = createFixture('42', getApplicationById);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button.primary-button').click();
    fixture.detectChanges();

    expect(getApplicationById).toHaveBeenCalledTimes(2);
    expect(getApplicationById).toHaveBeenLastCalledWith(42);
    expect(fixture.nativeElement.textContent).toContain('Application #42');
  });

  it('provides a back-to-applications navigation link', () => {
    const fixture = createFixture('42', vi.fn(() => of(application())));
    fixture.detectChanges();

    const backLink = fixture.nativeElement.querySelector('.back-link') as HTMLAnchorElement;
    expect(backLink.textContent).toContain('Back to applications');
    expect(backLink.getAttribute('href')).toBe('/officer/applications');
  });

  it('handles a response without optional resume or cover letter information', () => {
    const fixture = createFixture('42', vi.fn(() => of(application({
      resumeId: null,
      coverLetter: null,
    }))));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No resume attached');
    expect(fixture.nativeElement.textContent).not.toContain('Resume ID');
    expect(fixture.nativeElement.querySelector('#cover-letter-heading')).toBeNull();
  });
});

function createFixture(
  id: string,
  getApplicationById: ReturnType<typeof vi.fn>,
) {
  const paramMap = convertToParamMap({ id });
  TestBed.configureTestingModule({
    imports: [OfficerApplicationDetails],
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { paramMap: of(paramMap), snapshot: { paramMap } } },
      {
        provide: OfficerApplicationsService,
        useValue: { getApplicationById },
      },
    ],
  });
  return TestBed.createComponent(OfficerApplicationDetails);
}

function application(
  overrides: Partial<ApplicationResponse> = {},
): ApplicationResponse {
  return {
    id: 42,
    studentId: 735,
    jobId: 902,
    resumeId: 18,
    companyName: 'CampusFlow Labs',
    jobTitle: 'Graduate Engineer',
    coverLetter: 'I am interested in this role.',
    status: ApplicationStatus.UnderReview,
    appliedAt: '2026-11-14T10:00:00Z',
    updatedAt: '2026-11-14T10:30:00Z',
    ...overrides,
  };
}
