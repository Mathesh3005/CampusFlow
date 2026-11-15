import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { InterviewMode, InterviewResponse, InterviewStatus } from '../../../../core/models/domain.models';
import { OfficerInterviewStatus, OfficerInterviewsService } from '../../services/officer-interviews.service';
import { InterviewConfirmationDialog } from './interview-confirmation-dialog.component';
import { OfficerInterviewDetails } from './interview-details.component';

describe('OfficerInterviewDetails', () => {
  it('loads the interview and exposes scheduled-only actions', () => {
    const getInterviewById = vi.fn(() => of(interview()));
    const fixture = createFixture('81', { getInterviewById });
    fixture.detectChanges();

    expect(getInterviewById).toHaveBeenCalledWith(81);
    expect(fixture.nativeElement.textContent).toContain('Application #37');
    expect(fixture.nativeElement.textContent).toContain('https://meet.example.test/room');
    expect(fixture.nativeElement.textContent).toContain('Bring your portfolio.');
    expect(fixture.nativeElement.querySelector('.secondary-link')?.textContent).toContain('Edit interview');
    expect(fixture.nativeElement.querySelector('.complete-button')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.cancel-button')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.delete-button')).not.toBeNull();
  });

  it.each([
    [InterviewStatus.Completed, 'Mark completed', 'Interview marked completed.'],
    [InterviewStatus.Cancelled, 'Cancel interview', 'Interview cancelled successfully.'],
  ])('confirms and applies %s status changes', (status, confirmLabel, successMessage) => {
    const updated = interview({ status });
    const updateInterviewStatus = vi.fn((_id: number, _status: OfficerInterviewStatus) => of(updated));
    const fixture = createFixture('81', { updateInterviewStatus, confirmed: true });
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(status === InterviewStatus.Completed
      ? '.complete-button' : '.cancel-button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(fixture.dialog.open).toHaveBeenCalledWith(
      InterviewConfirmationDialog,
      expect.objectContaining({ role: 'alertdialog', data: expect.objectContaining({ confirmLabel }) }),
    );
    expect(updateInterviewStatus).toHaveBeenCalledWith(81, status);
    expect(fixture.nativeElement.textContent).toContain(successMessage);
    expect(fixture.nativeElement.querySelector('.complete-button')).toBeNull();
    expect(fixture.nativeElement.querySelector('.cancel-button')).toBeNull();
    expect(fixture.nativeElement.querySelector('.delete-button')).not.toBeNull();
  });

  it('does not make a status request when confirmation is cancelled', () => {
    const updateInterviewStatus = vi.fn(() => of(interview({ status: InterviewStatus.Completed })));
    const fixture = createFixture('81', { updateInterviewStatus });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.complete-button') as HTMLButtonElement).click();
    expect(fixture.dialog.open).toHaveBeenCalledOnce();
    expect(updateInterviewStatus).not.toHaveBeenCalled();
  });

  it('deletes after confirmation and shows a success state', () => {
    const deleteInterview = vi.fn(() => of(void 0));
    const fixture = createFixture('81', { deleteInterview, confirmed: true });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.delete-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.dialog.open).toHaveBeenCalledWith(
      InterviewConfirmationDialog,
      expect.objectContaining({
        data: expect.objectContaining({ title: 'Delete this interview?', destructive: true }),
      }),
    );
    expect(deleteInterview).toHaveBeenCalledWith(81);
    expect(fixture.nativeElement.textContent).toContain('Interview deleted successfully.');
    expect(fixture.nativeElement.querySelector('.delete-button')).toBeNull();
  });

  it.each([InterviewStatus.Completed, InterviewStatus.Cancelled])('hides edit and status controls for %s', status => {
    const fixture = createFixture('81', { getInterviewById: vi.fn(() => of(interview({ status }))) });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.secondary-link')).toBeNull();
    expect(fixture.nativeElement.querySelector('.complete-button')).toBeNull();
    expect(fixture.nativeElement.querySelector('.cancel-button')).toBeNull();
    expect(fixture.nativeElement.querySelector('.delete-button')).not.toBeNull();
  });

  it.each(['abc', '1e3', '0', '-1', '9007199254740992'])('rejects invalid ID %s without an API request', id => {
    const getInterviewById = vi.fn(() => of(interview()));
    const fixture = createFixture(id, { getInterviewById });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Invalid interview link');
    expect(getInterviewById).not.toHaveBeenCalled();
  });

  it.each([
    [401, 'Sign-in required'],
    [403, 'You do not have permission'],
    [404, 'not found or is not available'],
    [500, 'The server could not load this interview'],
  ])('handles detail HTTP %s', (status, message) => {
    const fixture = createFixture('81', {
      getInterviewById: vi.fn(() => throwError(() => new ApiError(status, 'other', { status }))),
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(message);
  });

  it.each([
    [400, 'request was not accepted', false],
    [401, 'session has expired', false],
    [403, 'permission to change', false],
    [404, 'could not be found or is no longer available', true],
    [409, 'may have changed since it was loaded', true],
  ])('handles status update HTTP %s', (status, message, canRefresh) => {
    const updateInterviewStatus = vi.fn(() => throwError(() => new ApiError(status, 'other', { status })));
    const fixture = createFixture('81', { updateInterviewStatus, confirmed: true });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.complete-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(message);
    expect(fixture.nativeElement.querySelector('.secondary-button') !== null).toBe(canRefresh);
    expect(fixture.componentInstance.actionPending()).toBe(false);
  });

  it('refreshes current data after a status conflict', () => {
    const getInterviewById = vi.fn()
      .mockReturnValueOnce(of(interview()))
      .mockReturnValueOnce(of(interview({ status: InterviewStatus.Completed })));
    const updateInterviewStatus = vi.fn(() => throwError(() => new ApiError(409, 'conflict', { status: 409 })));
    const fixture = createFixture('81', { getInterviewById, updateInterviewStatus, confirmed: true });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.complete-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.secondary-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(getInterviewById).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('.complete-button')).toBeNull();
  });

  it('does not submit a second operation while the first is pending', () => {
    const response = new Subject<InterviewResponse>();
    const updateInterviewStatus = vi.fn(() => response.asObservable());
    const fixture = createFixture('81', { updateInterviewStatus, confirmed: true });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.complete-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(updateInterviewStatus).toHaveBeenCalledOnce();
    expect((fixture.nativeElement.querySelector('.delete-button') as HTMLButtonElement).disabled).toBe(true);
    (fixture.nativeElement.querySelector('.delete-button') as HTMLButtonElement).click();
    expect(fixture.dialog.open).toHaveBeenCalledOnce();
    expect(updateInterviewStatus).toHaveBeenCalledOnce();
    response.next(interview({ status: InterviewStatus.Completed }));
    response.complete();
    fixture.detectChanges();
    expect(fixture.componentInstance.actionPending()).toBe(false);
  });
});

describe('InterviewConfirmationDialog', () => {
  it('closes with confirmation and cancellation', () => {
    const dialogRef = { close: vi.fn() };
    TestBed.configureTestingModule({
      imports: [InterviewConfirmationDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { title: 'Confirm', message: 'Continue?', confirmLabel: 'Continue' } },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    });
    const fixture = TestBed.createComponent(InterviewConfirmationDialog);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Continue?');
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    buttons[0].click();
    expect(dialogRef.close).toHaveBeenLastCalledWith(false);
    buttons[1].click();
    expect(dialogRef.close).toHaveBeenLastCalledWith(true);
  });
});

interface DetailsOverrides {
  getInterviewById?: OfficerInterviewsService['getInterviewById'];
  updateInterviewStatus?: (id: number, status: OfficerInterviewStatus) => Observable<InterviewResponse>;
  deleteInterview?: (id: number) => Observable<void>;
  confirmed?: boolean;
}

function createFixture(id: string, overrides: DetailsOverrides = {}) {
  const paramMap = convertToParamMap({ id });
  const dialog = { open: vi.fn(() => ({ afterClosed: () => of(overrides.confirmed ?? false) })) };
  const getInterviewById = overrides.getInterviewById ?? vi.fn(() => of(interview()));
  const updateInterviewStatus = overrides.updateInterviewStatus
    ?? vi.fn((_id: number, status: OfficerInterviewStatus) => of(interview({ status })));
  const deleteInterview = overrides.deleteInterview ?? vi.fn(() => of(void 0));

  TestBed.configureTestingModule({
    imports: [OfficerInterviewDetails],
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { paramMap: of(paramMap), snapshot: { paramMap } } },
      { provide: OfficerInterviewsService, useValue: { getInterviewById, updateInterviewStatus, deleteInterview } },
    ],
  });
  TestBed.overrideProvider(MatDialog, { useValue: dialog });
  return Object.assign(TestBed.createComponent(OfficerInterviewDetails), { dialog });
}

function interview(overrides: Partial<InterviewResponse> = {}): InterviewResponse {
  return {
    id: 81,
    applicationId: 37,
    scheduledAt: '2026-12-01T10:00:00Z',
    interviewMode: InterviewMode.Online,
    locationOrLink: 'https://meet.example.test/room',
    status: InterviewStatus.Scheduled,
    notes: 'Bring your portfolio.',
    createdAt: '2026-11-15T10:00:00Z',
    updatedAt: '2026-11-15T10:00:00Z',
    ...overrides,
  };
}
