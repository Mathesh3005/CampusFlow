import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { ApplicationResponse, ApplicationStatus, PageResponse } from '../../../../core/models/domain.models';
import { StudentApplicationsService } from '../../services/student-applications.service';
import { StudentApplicationsList } from './applications-list.component';
import { WithdrawalConfirmationDialog } from './withdrawal-confirmation-dialog.component';

interface ApplicationsListTestServices {
  listApplications?: (page: number, size: number) => Observable<PageResponse<ApplicationResponse>>;
  withdrawApplication?: (id: number) => Observable<ApplicationResponse>;
  confirmWithdrawal?: boolean;
}

describe('StudentApplicationsList', () => {
  it('shows loading and empty states while loading application history', () => {
    const response = new Subject<PageResponse<ApplicationResponse>>();
    const fixture = createFixture({ listApplications: () => response.asObservable() });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading applications');
    response.next(page([]));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No applications yet');
  });

  it('renders application details links, status, company, job title, and applied date', () => {
    const fixture = createFixture({ listApplications: () => of(page([application()])) });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Graduate Developer');
    expect(text).toContain('CampusFlow Labs');
    expect(text).toContain('APPLIED');
    expect(text).toContain('Nov 14, 2026');
    expect(fixture.nativeElement.querySelector('a[href="/student/applications/789"]')).toBeTruthy();
  });

  it('renders pagination and requests the selected page', () => {
    const listApplications = vi.fn((pageNumber: number) => of(page([application()], pageNumber, 2)));
    const fixture = createFixture({ listApplications });
    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('.pagination button')) as HTMLButtonElement[];
    buttons[1].click();
    fixture.detectChanges();

    expect(listApplications).toHaveBeenNthCalledWith(1, 0, 20);
    expect(listApplications).toHaveBeenNthCalledWith(2, 1, 20);
    expect(fixture.nativeElement.textContent).toContain('Page 2 of 2');
  });

  it('shows an error and retry control when application history cannot load', () => {
    const listApplications = vi.fn(() => throwError(() => new ApiError(500, 'server', { status: 500, detail: 'Unavailable' })));
    const fixture = createFixture({ listApplications });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Applications could not be loaded');
    const retry = fixture.nativeElement.querySelector('.state-message button') as HTMLButtonElement;
    retry.click();
    expect(listApplications).toHaveBeenCalledTimes(2);
  });

  it('shows a sign-in link when the list endpoint returns 401', () => {
    const fixture = createFixture({
      listApplications: () => throwError(() => new ApiError(401, 'unauthorized', { status: 401 })),
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Your session has expired');
    expect(fixture.nativeElement.querySelector('a[href="/login"]')).toBeTruthy();
  });

  it('only offers withdrawal for APPLIED, UNDER_REVIEW, and SHORTLISTED', () => {
    const fixture = createFixture({
      listApplications: () => of(page([
        application(ApplicationStatus.Applied, 1),
        application(ApplicationStatus.UnderReview, 2),
        application(ApplicationStatus.Shortlisted, 3),
        application(ApplicationStatus.Rejected, 4),
        application(ApplicationStatus.Selected, 5),
        application(ApplicationStatus.Withdrawn, 6),
      ])),
    });
    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('.withdraw-button')) as HTMLButtonElement[];
    const ids = buttons.map(button => button.getAttribute('data-application-id'));
    expect(ids).toEqual(['1', '2', '3']);
  });

  it('requires confirmation, withdraws, refreshes the current page, and shows success', () => {
    let listCalls = 0;
    const listApplications = vi.fn(() => of(page([
      application(listCalls++ === 0 ? ApplicationStatus.Applied : ApplicationStatus.Withdrawn),
    ])));
    const withdrawApplication = vi.fn(() => of(application(ApplicationStatus.Withdrawn)));
    const fixture = createFixture({
      listApplications,
      withdrawApplication,
      confirmWithdrawal: true,
    });
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.withdraw-button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(fixture.dialog.open).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ data: { jobTitle: 'Graduate Developer', companyName: 'CampusFlow Labs' }, role: 'alertdialog' }),
    );
    expect(withdrawApplication).toHaveBeenCalledWith(789);
    expect(listApplications).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('was withdrawn');
    expect(fixture.nativeElement.querySelector('.withdraw-button')).toBeNull();
  });

  it('does not withdraw when confirmation is dismissed', () => {
    const withdrawApplication = vi.fn(() => of(application(ApplicationStatus.Withdrawn)));
    const fixture = createFixture({
      listApplications: () => of(page([application()])),
      withdrawApplication,
      confirmWithdrawal: false,
    });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.withdraw-button') as HTMLButtonElement).click();

    expect(withdrawApplication).not.toHaveBeenCalled();
  });

  it.each([
    [401, 'Your session has expired. Sign in again before withdrawing an application.', 1],
    [404, 'This application could not be found. Your list has been refreshed.', 2],
    [409, 'This application can no longer be withdrawn. Your list has been refreshed.', 2],
  ])('handles withdrawal HTTP %s', (status, expectedMessage, expectedListCalls) => {
    const listApplications = vi.fn(() => of(page([application()])));
    const withdrawApplication = vi.fn(() => throwError(() => new ApiError(status, 'other', { status })));
    const fixture = createFixture({
      listApplications,
      withdrawApplication,
      confirmWithdrawal: true,
    });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.withdraw-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(expectedMessage);
    expect(listApplications).toHaveBeenCalledTimes(expectedListCalls);
    if (status === 401) expect(fixture.nativeElement.querySelector('a[href="/login"]')).toBeTruthy();
  });
});

describe('WithdrawalConfirmationDialog', () => {
  it('shows the target application and closes with confirmation or cancellation', () => {
    const dialogRef = { close: vi.fn() };
    TestBed.configureTestingModule({
      imports: [WithdrawalConfirmationDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { jobTitle: 'Graduate Developer', companyName: 'CampusFlow Labs' } },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    });
    const fixture = TestBed.createComponent(WithdrawalConfirmationDialog);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Graduate Developer');
    expect(fixture.nativeElement.textContent).toContain('CampusFlow Labs');
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    buttons[0].click();
    expect(dialogRef.close).toHaveBeenLastCalledWith(false);
    buttons[1].click();
    expect(dialogRef.close).toHaveBeenLastCalledWith(true);
  });
});

function createFixture(services: ApplicationsListTestServices = {}) {
  const dialog = {
    open: vi.fn(() => ({ afterClosed: () => of(services.confirmWithdrawal ?? false) })),
  };
  TestBed.configureTestingModule({
    imports: [StudentApplicationsList],
    providers: [
      provideRouter([]),
      {
        provide: StudentApplicationsService,
        useValue: {
          listApplications: services.listApplications ?? (() => of(page([]))),
          withdrawApplication: services.withdrawApplication ?? (() => of(application(ApplicationStatus.Withdrawn))),
        },
      },
    ],
  });
  TestBed.overrideProvider(MatDialog, { useValue: dialog });
  return Object.assign(TestBed.createComponent(StudentApplicationsList), { dialog });
}

function page(
  content: ApplicationResponse[],
  pageNumber = 0,
  totalPages = content.length === 0 ? 0 : 1,
): PageResponse<ApplicationResponse> {
  return {
    content, page: pageNumber, size: 20, totalElements: totalPages * 20,
    totalPages, first: pageNumber === 0, last: pageNumber === totalPages - 1,
    hasNext: pageNumber < totalPages - 1, hasPrevious: pageNumber > 0,
  };
}

function application(status = ApplicationStatus.Applied, id = 789): ApplicationResponse {
  return {
    id, studentId: 12, jobId: 22, resumeId: null, companyName: 'CampusFlow Labs',
    jobTitle: 'Graduate Developer', coverLetter: null, status,
    appliedAt: '2026-11-14T10:00:00Z', updatedAt: '2026-11-14T10:00:00Z',
  };
}
