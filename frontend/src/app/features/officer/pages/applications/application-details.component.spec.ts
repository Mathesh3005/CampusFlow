import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { ApplicationResponse, ApplicationStatus } from '../../../../core/models/domain.models';
import { OfficerApplicationStatus, OfficerApplicationsService } from '../../services/officer-applications.service';
import { ApplicationStatusConfirmationDialog } from './application-status-confirmation-dialog.component';
import { OfficerApplicationDetails } from './application-details.component';

describe('OfficerApplicationDetails', () => {
  it('loads the requested application and renders only available response details', () => {
    const getApplicationById = vi.fn(() => of(application()));
    const fixture = createFixture('42', getApplicationById);
    fixture.detectChanges();

    expect(getApplicationById).toHaveBeenCalledOnce();
    expect(getApplicationById).toHaveBeenCalledWith(42);

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Application#42');
    expect(text).toContain('Student One');
    expect(text).toContain('REG-735');
    expect(text).toContain('Job#902');
    expect(text).toContain('UNDER REVIEW');
    expect(text).toContain('Applied');
    expect(text).toContain('resume.pdf');
    expect(text).toContain('Cover letter');
    expect(text).toContain('I am interested in this role.');
    expect(text).toContain('Graduate Engineer');
    expect(text).toContain('Choose the next status for this application.');
    expect(fixture.nativeElement.querySelector('[data-status="SHORTLISTED"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-status="REJECTED"]')).not.toBeNull();
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
    expect(fixture.nativeElement.textContent).toContain('Application#42');
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

  it.each([
    [ApplicationStatus.Applied, ['UNDER_REVIEW', 'REJECTED']],
    [ApplicationStatus.UnderReview, ['SHORTLISTED', 'REJECTED']],
    [ApplicationStatus.Shortlisted, ['SELECTED', 'REJECTED']],
    [ApplicationStatus.Rejected, []],
    [ApplicationStatus.Selected, []],
    [ApplicationStatus.Withdrawn, []],
  ] as const)('shows only permitted status actions from %s', (status, targets) => {
    const fixture = createFixture('42', vi.fn(() => of(application({ status }))));
    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button[data-status]') as NodeListOf<HTMLButtonElement>);
    expect(buttons.map(button => button.getAttribute('data-status')).sort()).toEqual([...targets].sort());
    if (targets.length === 0) {
      expect(fixture.nativeElement.textContent).toContain('No further status actions are available');
    }
  });

  it.each([
    [ApplicationStatus.Applied, ApplicationStatus.UnderReview],
    [ApplicationStatus.Applied, ApplicationStatus.Rejected],
    [ApplicationStatus.UnderReview, ApplicationStatus.Shortlisted],
    [ApplicationStatus.UnderReview, ApplicationStatus.Rejected],
    [ApplicationStatus.Shortlisted, ApplicationStatus.Selected],
    [ApplicationStatus.Shortlisted, ApplicationStatus.Rejected],
  ])('confirms and applies the permitted transition %s to %s', (source, target) => {
    const updated = application({ status: target, updatedAt: '2026-11-15T10:00:00Z' });
    const updateApplicationStatus = vi.fn((_id: number, _status: OfficerApplicationStatus) => of(updated));
    const fixture = createFixture('42', vi.fn(() => of(application({ status: source }))), {
      updateApplicationStatus,
      confirmed: true,
    });
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(`[data-status="${target}"]`) as HTMLButtonElement;
    expect(button).not.toBeNull();
    button.click();
    fixture.detectChanges();

    expect(fixture.dialog.open).toHaveBeenCalledWith(
      ApplicationStatusConfirmationDialog,
      expect.objectContaining({
        data: { targetStatus: target, jobTitle: 'Graduate Engineer', companyName: 'CampusFlow Labs' },
        role: 'alertdialog',
      }),
    );
    expect(updateApplicationStatus).toHaveBeenCalledOnce();
    expect(updateApplicationStatus).toHaveBeenCalledWith(42, target);
    expect(fixture.componentInstance.state()).toEqual({ status: 'ready', application: updated });
    expect(fixture.nativeElement.textContent).toContain(`Application status updated to ${target.replace('_', ' ')}.`);
    expect(fixture.nativeElement.querySelector('.status-chip')?.textContent).toContain(target.replace('_', ' '));
  });

  it('does not send a status update when confirmation is dismissed', () => {
    const updateApplicationStatus = vi.fn(() => of(application({ status: ApplicationStatus.UnderReview })));
    const fixture = createFixture('42', vi.fn(() => of(application({ status: ApplicationStatus.Applied }))), {
      updateApplicationStatus,
    });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[data-status="UNDER_REVIEW"]') as HTMLButtonElement).click();

    expect(fixture.dialog.open).toHaveBeenCalledOnce();
    expect(updateApplicationStatus).not.toHaveBeenCalled();
  });

  it('rejects a forbidden transition even if confirmStatusChange is invoked directly', () => {
    const updateApplicationStatus = vi.fn(() => of(application()));
    const fixture = createFixture('42', vi.fn(() => of(application({ status: ApplicationStatus.Applied }))), {
      updateApplicationStatus,
      confirmed: true,
    });
    fixture.detectChanges();

    fixture.componentInstance.confirmStatusChange(application({ status: ApplicationStatus.Applied }), ApplicationStatus.Selected);

    expect(fixture.dialog.open).not.toHaveBeenCalled();
    expect(updateApplicationStatus).not.toHaveBeenCalled();
  });

  it('disables status actions and blocks duplicate requests while an update is pending', () => {
    const response = new Subject<ApplicationResponse>();
    const updateApplicationStatus = vi.fn(() => response.asObservable());
    const fixture = createFixture('42', vi.fn(() => of(application({ status: ApplicationStatus.Applied }))), {
      updateApplicationStatus,
      confirmed: true,
    });
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('[data-status="UNDER_REVIEW"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(updateApplicationStatus).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.actionPending()).toBe(true);
    expect(Array.from(fixture.nativeElement.querySelectorAll('button[data-status]') as NodeListOf<HTMLButtonElement>)
      .every(button => button.disabled)).toBe(true);

    fixture.componentInstance.confirmStatusChange(application({ status: ApplicationStatus.Applied }), ApplicationStatus.Rejected);
    expect(fixture.dialog.open).toHaveBeenCalledOnce();
    expect(updateApplicationStatus).toHaveBeenCalledOnce();

    response.next(application({ status: ApplicationStatus.UnderReview }));
    response.complete();
    fixture.detectChanges();
    expect(fixture.componentInstance.actionPending()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Application status updated to UNDER REVIEW.');
  });

  it.each([
    [400, 'The status change was not accepted', false],
    [401, 'Your session has expired', false],
    [403, 'You do not have permission to change this application', false],
    [404, 'could not be found or is no longer available', true],
    [409, 'status may have changed since this page loaded', true],
  ])('shows status-update feedback for HTTP %s', (status, message, canRefresh) => {
    const updateApplicationStatus = vi.fn(() => throwError(() => new ApiError(
      status,
      'other',
      { status, detail: 'Untrusted server detail' },
    )));
    const fixture = createFixture('42', vi.fn(() => of(application({ status: ApplicationStatus.Applied }))), {
      updateApplicationStatus,
      confirmed: true,
    });
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('[data-status="UNDER_REVIEW"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(message);
    expect(fixture.nativeElement.textContent).not.toContain('Untrusted server detail');
    expect(fixture.nativeElement.querySelector('.feedback.error-message .secondary-button') !== null).toBe(canRefresh);
    expect(fixture.componentInstance.actionPending()).toBe(false);
  });

  it('refreshes application details when a status conflict is reported', () => {
    const getApplicationById = vi.fn()
      .mockReturnValueOnce(of(application({ status: ApplicationStatus.Applied })))
      .mockReturnValueOnce(of(application({ status: ApplicationStatus.UnderReview })));
    const updateApplicationStatus = vi.fn(() => throwError(() => new ApiError(409, 'conflict', { status: 409 })));
    const fixture = createFixture('42', getApplicationById, { updateApplicationStatus, confirmed: true });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[data-status="UNDER_REVIEW"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.secondary-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(getApplicationById).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('[data-status="UNDER_REVIEW"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-status="SHORTLISTED"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.error-message')).toBeNull();
  });
});

describe('ApplicationStatusConfirmationDialog', () => {
  it('describes the requested status and closes with confirmation or cancellation', () => {
    const dialogRef = { close: vi.fn() };
    TestBed.configureTestingModule({
      imports: [ApplicationStatusConfirmationDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {
          targetStatus: ApplicationStatus.Rejected,
          jobTitle: 'Graduate Engineer',
          companyName: 'CampusFlow Labs',
        } },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    });
    const fixture = TestBed.createComponent(ApplicationStatusConfirmationDialog);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Change application status?');
    expect(fixture.nativeElement.textContent).toContain('Graduate Engineer');
    expect(fixture.nativeElement.textContent).toContain('REJECTED');
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    buttons[0].click();
    expect(dialogRef.close).toHaveBeenLastCalledWith(false);
    buttons[1].click();
    expect(dialogRef.close).toHaveBeenLastCalledWith(true);
  });
});

interface ApplicationDetailsTestOverrides {
  updateApplicationStatus?: (id: number, status: OfficerApplicationStatus) => Observable<ApplicationResponse>;
  confirmed?: boolean;
}

function createFixture(
  id: string,
  getApplicationById: ReturnType<typeof vi.fn>,
  overrides: ApplicationDetailsTestOverrides = {},
) {
  const paramMap = convertToParamMap({ id });
  const dialog = {
    open: vi.fn(() => ({ afterClosed: () => of(overrides.confirmed ?? false) })),
  };
  const updateApplicationStatus = overrides.updateApplicationStatus
    ?? vi.fn((_id: number, status: OfficerApplicationStatus) => of(application({ status })));
  TestBed.configureTestingModule({
    imports: [OfficerApplicationDetails],
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { paramMap: of(paramMap), snapshot: { paramMap } } },
      {
        provide: OfficerApplicationsService,
        useValue: { getApplicationById, updateApplicationStatus },
      },
    ],
  });
  TestBed.overrideProvider(MatDialog, { useValue: dialog });
  return Object.assign(TestBed.createComponent(OfficerApplicationDetails), { dialog });
}

function application(
  overrides: Partial<ApplicationResponse> = {},
): ApplicationResponse {
  return {
    id: 42,
    studentId: 735,
    studentName: 'Student One',
    studentRegisterNumber: 'REG-735',
    studentDepartment: 'Computer Science',
    studentCgpa: 8.5,
    jobId: 902,
    resumeId: 18,
    resumeFileName: 'resume.pdf',
    companyName: 'CampusFlow Labs',
    jobTitle: 'Graduate Engineer',
    coverLetter: 'I am interested in this role.',
    status: ApplicationStatus.UnderReview,
    appliedAt: '2026-11-14T10:00:00Z',
    updatedAt: '2026-11-14T10:30:00Z',
    ...overrides,
  };
}
