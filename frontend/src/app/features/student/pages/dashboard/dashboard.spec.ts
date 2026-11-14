import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { AuthStateStore } from '../../../../core/auth/auth-state.store';
import { UserRole } from '../../../../core/models/auth.models';
import { ApplicationStatus, EmploymentType, InterviewMode, InterviewStatus, JobStatus, NotificationType, WorkMode } from '../../../../core/models/domain.models';
import { StudentDashboardData } from '../../models/dashboard.models';
import { StudentDashboardService } from '../../services/student-dashboard.service';
import { StudentDashboard } from './dashboard';

describe('StudentDashboard', () => {
  let response: Subject<StudentDashboardData>;
  let auth: AuthStateStore;

  beforeEach(() => {
    response = new Subject<StudentDashboardData>();
    TestBed.configureTestingModule({
      imports: [StudentDashboard],
      providers: [
        provideRouter([]),
        { provide: StudentDashboardService, useValue: { loadDashboard: () => response.asObservable() } },
      ],
    });
    auth = TestBed.inject(AuthStateStore);
    auth.setSession({
      accessToken: 'dashboard-test-token', tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      userId: 1, email: 'student@example.edu', role: UserRole.Student,
    });
  });

  afterEach(() => auth.clear());

  it('shows loading state until dashboard requests complete', () => {
    const fixture = TestBed.createComponent(StudentDashboard);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading applications');
    expect(fixture.nativeElement.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it('renders empty states when successful API pages contain no items', () => {
    const fixture = TestBed.createComponent(StudentDashboard);
    fixture.detectChanges();
    response.next(emptyDashboard());
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('You have not applied to any jobs yet.');
    expect(text).toContain('No eligible published jobs are available right now.');
    expect(text).toContain('You have no upcoming interviews.');
    expect(text).toContain('You have no notifications yet.');
  });

  it('renders values from the backend response and section-specific failures', () => {
    const fixture = TestBed.createComponent(StudentDashboard);
    fixture.detectChanges();
    const data = emptyDashboard();
    data.applications.page = page([{
      id: 9, studentId: 1, jobId: 3, resumeId: null, companyName: 'Northwind',
      jobTitle: 'Graduate Analyst', coverLetter: null, status: ApplicationStatus.Shortlisted,
      appliedAt: '2026-10-10T12:00:00Z', updatedAt: '2026-10-11T12:00:00Z',
    }], 7);
    data.jobs.page = page([{
      id: 3, createdById: 4, companyName: 'Northwind', jobTitle: 'Graduate Analyst',
      jobDescription: 'Role description', location: 'Chennai', employmentType: EmploymentType.FullTime,
      workMode: WorkMode.Hybrid, minimumCgpa: null, salaryMin: null, salaryMax: null,
      applicationDeadline: '2026-12-01T00:00:00Z', status: JobStatus.Published,
      createdAt: '2026-10-01T12:00:00Z', updatedAt: '2026-10-01T12:00:00Z',
    }], 11);
    data.interviews.interviews = [{
      id: 55, applicationId: 9, scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
      interviewMode: InterviewMode.Online, locationOrLink: 'https://meet.example.edu/room',
      status: InterviewStatus.Scheduled, notes: null,
      createdAt: '2026-10-11T12:00:00Z', updatedAt: '2026-10-11T12:00:00Z',
    }];
    data.notifications.page = page([{
      id: 6, userId: 1, title: 'Interview scheduled', message: 'An interview was scheduled.',
      notificationType: NotificationType.Interview, isRead: false, createdAt: '2026-10-11T12:00:00Z',
    }], 1);

    response.next(data);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('student@example.edu');
    expect(text).toContain('7');
    expect(text).toContain('11');
    expect(text).toContain('Graduate Analyst');
    expect(text).toContain('Northwind');
    expect(text).toContain('Interview scheduled');
    expect(text).toContain('Unread');
    expect(text).toContain('Application #9');
    expect(text).toContain('https://meet.example.edu/room');
    expect(fixture.nativeElement.querySelector('.welcome-meta')?.textContent?.trim().endsWith('UTC')).toBe(true);
    expect(fixture.nativeElement.querySelector('#interviews-title')?.closest('section')?.querySelector('time')?.textContent?.trim().endsWith('UTC')).toBe(true);
  });

  it('shows the partial-interview-results notice when more pages remain', () => {
    const fixture = TestBed.createComponent(StudentDashboard);
    fixture.detectChanges();
    const data = emptyDashboard();
    data.interviews.partialResults = true;
    response.next(data);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Showing a partial list');
  });

  it('shows a failed panel while keeping the rest of the dashboard available', () => {
    const fixture = TestBed.createComponent(StudentDashboard);
    fixture.detectChanges();
    const data = emptyDashboard();
    data.jobs.error = 'Job service unavailable';
    response.next(data);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Job service unavailable');
    expect(text).toContain('You have not applied to any jobs yet.');
  });
});

function emptyDashboard(): StudentDashboardData {
  return {
    applications: { page: page([]), error: null },
    jobs: { page: page([]), error: null },
    interviews: { interviews: [], error: null, partialResults: false },
    notifications: { page: page([]), error: null },
  };
}

function page<T>(content: T[], totalElements = content.length) {
  return {
    content, page: 0, size: Math.max(1, content.length), totalElements,
    totalPages: totalElements > 0 ? 1 : 0, first: true, last: true, hasNext: false, hasPrevious: false,
  };
}
