import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { InterviewMode, InterviewRequest, InterviewResponse, InterviewStatus, InterviewUpdateRequest } from '../../../../core/models/domain.models';
import { OfficerInterviewsService } from '../../services/officer-interviews.service';
import { InterviewConfirmationDialog } from './interview-confirmation-dialog.component';
import { OfficerInterviewForm } from './interview-form.component';

describe('OfficerInterviewForm', () => {
  it('validates required fields and does not open confirmation for invalid data', () => {
    const scheduleInterview = vi.fn(() => of(interview()));
    const fixture = createFixture(null, { scheduleInterview });
    fixture.detectChanges();
    fixture.componentInstance.onSubmit();
    fixture.detectChanges();

    expect(fixture.componentInstance.form.invalid).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('positive whole-number application ID');
    expect(fixture.dialog.open).not.toHaveBeenCalled();
    expect(scheduleInterview).not.toHaveBeenCalled();
  });

  it('confirms scheduling and sends the backend request shape', () => {
    const scheduleInterview = vi.fn((request: InterviewRequest) => of(interview({
      applicationId: request.applicationId,
      scheduledAt: request.scheduledAt,
      interviewMode: request.interviewMode,
      locationOrLink: request.locationOrLink,
      notes: request.notes ?? null,
    })));
    const fixture = createFixture(null, { scheduleInterview, confirmed: true });
    fixture.detectChanges();
    fixture.componentInstance.form.patchValue({
      applicationId: 37,
      scheduledAt: futureDateInput(),
      interviewMode: InterviewMode.Online,
      locationOrLink: '  https://meet.example.test/room  ',
      notes: '  Bring a portfolio.  ',
    });

    fixture.componentInstance.onSubmit();
    fixture.detectChanges();

    expect(fixture.dialog.open).toHaveBeenCalledWith(
      InterviewConfirmationDialog,
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Schedule this interview?',
          message: 'Schedule an interview for application #37?',
        }),
        role: 'alertdialog',
      }),
    );
    expect(scheduleInterview).toHaveBeenCalledOnce();
    const request = scheduleInterview.mock.calls[0][0];
    expect(request.applicationId).toBe(37);
    expect(Date.parse(request.scheduledAt)).toBeGreaterThan(Date.now());
    expect(request.interviewMode).toBe(InterviewMode.Online);
    expect(request.locationOrLink).toBe('https://meet.example.test/room');
    expect(request.notes).toBe('Bring a portfolio.');
    expect(fixture.nativeElement.textContent).toContain('Interview scheduled successfully.');
    expect(fixture.nativeElement.querySelector('a[href="/officer/interviews/81"]')).not.toBeNull();
  });

  it('does not make the schedule request when confirmation is dismissed', () => {
    const scheduleInterview = vi.fn(() => of(interview()));
    const fixture = createFixture(null, { scheduleInterview });
    fixture.detectChanges();
    setValidForm(fixture.componentInstance.form);
    fixture.componentInstance.onSubmit();
    expect(fixture.dialog.open).toHaveBeenCalledOnce();
    expect(scheduleInterview).not.toHaveBeenCalled();
  });

  it('loads scheduled interview details and sends a full update DTO without applicationId', () => {
    const scheduled = interview();
    const getInterviewById = vi.fn(() => of(scheduled));
    const updateInterview = vi.fn((id: number, request: InterviewUpdateRequest) => of({
      ...scheduled,
      ...request,
      id,
    }));
    const fixture = createFixture('81', { getInterviewById, updateInterview, confirmed: true });
    fixture.detectChanges();
    expect(fixture.componentInstance.state()).toEqual({ status: 'ready' });
    expect(fixture.componentInstance.form.controls.applicationId.value).toBe(37);

    fixture.componentInstance.form.patchValue({
      scheduledAt: futureDateInput(),
      interviewMode: InterviewMode.Offline,
      locationOrLink: 'Room 4',
      notes: '',
    });
    fixture.componentInstance.onSubmit();
    fixture.detectChanges();

    expect(updateInterview).toHaveBeenCalledOnce();
    expect(updateInterview.mock.calls[0][0]).toBe(81);
    expect(updateInterview.mock.calls[0][1]).toEqual(expect.objectContaining({
      interviewMode: InterviewMode.Offline,
      locationOrLink: 'Room 4',
      notes: null,
    }));
    expect(updateInterview.mock.calls[0][1]).not.toHaveProperty('applicationId');
    expect(fixture.nativeElement.textContent).toContain('Interview saved successfully.');
  });

  it.each(['abc', '1e3', '0', '-1', '9007199254740992'])('rejects invalid edit ID %s', id => {
    const getInterviewById = vi.fn(() => of(interview()));
    const fixture = createFixture(id, { getInterviewById });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Invalid interview link');
    expect(getInterviewById).not.toHaveBeenCalled();
  });

  it.each([InterviewStatus.Completed, InterviewStatus.Cancelled])('does not allow editing a %s interview', status => {
    const fixture = createFixture('81', { getInterviewById: vi.fn(() => of(interview({ status }))) });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Only scheduled interviews can be edited');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it.each([
    [400, 'interview details are invalid'],
    [401, 'session has expired'],
    [403, 'permission to manage'],
    [409, 'Only applications with SHORTLISTED status'],
  ])('handles scheduling HTTP %s', (status, message) => {
    const scheduleInterview = vi.fn(() => throwError(() => new ApiError(status, 'other', { status })));
    const fixture = createFixture(null, { scheduleInterview, confirmed: true });
    fixture.detectChanges();
    setValidForm(fixture.componentInstance.form);
    fixture.componentInstance.onSubmit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(message);
    expect(fixture.componentInstance.submitting()).toBe(false);
  });

  it('provides refresh after a stale update conflict', () => {
    const getInterviewById = vi.fn()
      .mockReturnValueOnce(of(interview()))
      .mockReturnValueOnce(of(interview()));
    const updateInterview = vi.fn(() => throwError(() => new ApiError(409, 'conflict', { status: 409 })));
    const fixture = createFixture('81', { getInterviewById, updateInterview, confirmed: true });
    fixture.detectChanges();
    fixture.componentInstance.form.patchValue({ scheduledAt: futureDateInput() });
    fixture.componentInstance.onSubmit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('may no longer be scheduled');
    (fixture.nativeElement.querySelector('.secondary-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(getInterviewById).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('.api-error')).toBeNull();
  });

  it('prevents duplicate schedule submissions while a request is pending', () => {
    const response = new Subject<InterviewResponse>();
    const scheduleInterview = vi.fn(() => response.asObservable());
    const fixture = createFixture(null, { scheduleInterview, confirmed: true });
    fixture.detectChanges();
    setValidForm(fixture.componentInstance.form);
    fixture.componentInstance.onSubmit();
    expect(fixture.componentInstance.submitting()).toBe(true);
    fixture.componentInstance.onSubmit();
    expect(scheduleInterview).toHaveBeenCalledOnce();
    response.next(interview());
    response.complete();
    fixture.detectChanges();
    expect(fixture.componentInstance.submitting()).toBe(false);
  });
});

describe('InterviewConfirmationDialog', () => {
  it('shows the operation prompt and returns its confirmation decision', () => {
    const dialogRef = { close: vi.fn() };
    TestBed.configureTestingModule({
      imports: [InterviewConfirmationDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { title: 'Schedule?', message: 'Continue?', confirmLabel: 'Schedule' } },
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

interface FormOverrides {
  getInterviewById?: OfficerInterviewsService['getInterviewById'];
  scheduleInterview?: (request: InterviewRequest) => Observable<InterviewResponse>;
  updateInterview?: (id: number, request: InterviewUpdateRequest) => Observable<InterviewResponse>;
  confirmed?: boolean;
}

function createFixture(id: string | null, overrides: FormOverrides = {}) {
  const paramMap = convertToParamMap(id === null ? {} : { id });
  const dialog = { open: vi.fn(() => ({ afterClosed: () => of(overrides.confirmed ?? false) })) };
  const getInterviewById = overrides.getInterviewById ?? vi.fn(() => of(interview()));
  const scheduleInterview = overrides.scheduleInterview ?? vi.fn(() => of(interview()));
  const updateInterview = overrides.updateInterview ?? vi.fn(() => of(interview()));

  TestBed.configureTestingModule({
    imports: [OfficerInterviewForm],
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { paramMap: of(paramMap), snapshot: { paramMap } } },
      { provide: OfficerInterviewsService, useValue: { getInterviewById, scheduleInterview, updateInterview } },
    ],
  });
  TestBed.overrideProvider(MatDialog, { useValue: dialog });
  return Object.assign(TestBed.createComponent(OfficerInterviewForm), { dialog });
}

function setValidForm(form: OfficerInterviewForm['form']): void {
  form.patchValue({
    applicationId: 37,
    scheduledAt: futureDateInput(),
    interviewMode: InterviewMode.Online,
    locationOrLink: 'Room 4',
    notes: '',
  });
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

function futureDateInput(): string {
  const date = new Date(Date.now() + 86_400_000);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}
