import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { InterviewMode, InterviewResponse, InterviewStatus } from '../../../../core/models/domain.models';
import { StudentInterviewsService } from '../../services/student-interviews.service';
import { StudentInterviewDetails } from './interview-details.component';

describe('StudentInterviewDetails', () => {
  it('loads all response details with read-only controls', () => {
    const getInterviewById = vi.fn(() => of(interview()));
    const fixture = createFixture('81', getInterviewById);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(getInterviewById).toHaveBeenCalledWith(81);
    expect(text).toContain('Application #37');
    expect(text).toContain('ONLINE');
    expect(text).toContain('https://meet.example.test/room');
    expect(text).toContain('SCHEDULED');
    expect(text).toContain('Bring your portfolio.');
    expect(text).toContain('UTC');
    expect(fixture.nativeElement.querySelectorAll('button')).toHaveLength(0);
  });

  it.each(['abc', '1e3', '0', '-1', '9007199254740992'])('rejects invalid ID %s without requesting the API', id => {
    const getInterviewById = vi.fn(() => of(interview()));
    const fixture = createFixture(id, getInterviewById);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Invalid interview link');
    expect(getInterviewById).not.toHaveBeenCalled();
  });

  it.each([
    [401, 'Sign-in required'],
    [403, 'You do not have permission'],
    [404, 'not found or is not available'],
    [500, 'The server could not load this interview'],
  ])('handles interview details HTTP %s', (status, message) => {
    const fixture = createFixture('81', () => throwError(() => new ApiError(status, 'other', { status })));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(message);
  });

  it('retries a transient error for the requested ID', () => {
    const getInterviewById = vi.fn()
      .mockReturnValueOnce(throwError(() => new ApiError(503, 'server', { status: 503 })))
      .mockReturnValueOnce(of(interview()));
    const fixture = createFixture('81', getInterviewById);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.primary-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(getInterviewById).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('Interview #81');
  });
});

function createFixture(id: string, getInterviewById: StudentInterviewsService['getInterviewById']) {
  const paramMap = convertToParamMap({ id });
  TestBed.configureTestingModule({
    imports: [StudentInterviewDetails],
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { paramMap: of(paramMap), snapshot: { paramMap } } },
      { provide: StudentInterviewsService, useValue: { getInterviewById } },
    ],
  });
  return TestBed.createComponent(StudentInterviewDetails);
}

function interview(): InterviewResponse {
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
  };
}
