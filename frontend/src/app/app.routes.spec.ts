import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { AuthStateStore } from './core/auth/auth-state.store';
import { UserRole } from './core/models/auth.models';
import { officerRoutes } from './features/officer/officer.routes';
import { OfficerAnalyticsService } from './features/officer/services/officer-analytics.service';
import { OfficerInterviewsService } from './features/officer/services/officer-interviews.service';
import { StudentInterviewsService } from './features/student/services/student-interviews.service';
import { routes } from './app.routes';

const emptyPage = {
  content: [],
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
  hasNext: false,
  hasPrevious: false,
};

describe('application route configuration', () => {
  let auth: AuthStateStore;
  let router: Router;
  let requests: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: OfficerAnalyticsService,
          useValue: {
            getOverview: () => of({
              placementRate: 0,
              publishedJobs: 0,
              selectedStudents: 0,
              totalApplications: 0,
              totalJobs: 0,
              totalStudents: 0,
            }),
            getDepartmentPlacements: () => of([]),
            getPlacementTrends: () => of([]),
            getTopDepartments: () => of([]),
          },
        },
        { provide: StudentInterviewsService, useValue: { listInterviews: () => of(emptyPage) } },
        { provide: OfficerInterviewsService, useValue: { listInterviews: () => of(emptyPage) } },
      ],
    });
    auth = TestBed.inject(AuthStateStore);
    router = TestBed.inject(Router);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    for (const request of requests.match(() => true)) {
      if (!request.cancelled) request.flush(emptyPage);
    }
    auth.clear();
  });

  it('redirects a direct student URL to login when unauthenticated', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/student/jobs');
    expect(router.url).toContain('/login');
  });

  it('allows a student to navigate directly to a student route', async () => {
    setUser(UserRole.Student);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/student/jobs');
    expect(router.url).toBe('/student/jobs');
    expect(harness.routeNativeElement?.textContent).toContain('Jobs');
  });

  it('redirects a student who opens an officer URL to their own dashboard', async () => {
    setUser(UserRole.Student);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/officer/dashboard');
    expect(router.url).toBe('/student/dashboard');
  });

  it('registers the dashboard under the placement-officer guarded workspace', () => {
    const workspace = officerRoutes[0];
    const dashboard = workspace.children?.find(route => route.path === 'dashboard');
    expect(workspace.data?.['role']).toBe(UserRole.PlacementOfficer);
    expect(workspace.canActivate?.length).toBeGreaterThan(0);
    expect(typeof dashboard?.loadComponent).toBe('function');
    expect(dashboard?.component).toBeUndefined();
  });

  it('allows an authenticated officer to navigate from the dashboard to Analytics', async () => {
    setUser(UserRole.PlacementOfficer);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/officer/dashboard');
    await harness.navigateByUrl('/officer/analytics');

    expect(router.url).toBe('/officer/analytics');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Analytics Overview');
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('redirects a student away from officer Analytics', async () => {
    setUser(UserRole.Student);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/officer/analytics');

    expect(router.url).toBe('/student/dashboard');
    expect(harness.routeNativeElement?.textContent).not.toContain('Analytics Overview');
  });

  it('allows an officer to navigate directly to an officer route', async () => {
    setUser(UserRole.PlacementOfficer);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/officer/interviews');
    expect(router.url).toBe('/officer/interviews');
    expect(harness.routeNativeElement?.textContent).toContain('Interview Management');
  });

  it('allows a student to open their read-only interview list', async () => {
    setUser(UserRole.Student);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/student/interviews');
    expect(router.url).toBe('/student/interviews');
    expect(harness.routeNativeElement?.textContent).toContain('My interviews');
    expect(harness.routeNativeElement?.textContent).toContain('No interviews yet');
  });

  it('loads the shared notifications page inside the student workspace', async () => {
    setUser(UserRole.Student);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/student/notifications');
    expect(router.url).toBe('/student/notifications');
    expect(harness.routeNativeElement?.textContent).toContain('Notifications');
  });

  it('loads the shared notifications page inside the officer workspace', async () => {
    setUser(UserRole.PlacementOfficer);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/officer/notifications');
    expect(router.url).toBe('/officer/notifications');
    expect(harness.routeNativeElement?.textContent).toContain('Notifications');
  });

  it('redirects an authenticated student away from the login URL', async () => {
    setUser(UserRole.Student);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/login');
    expect(router.url).toBe('/student/dashboard');
  });

  function setUser(role: UserRole): void {
    auth.setSession({
      accessToken: 'route-test-token',
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      userId: 8,
      email: 'route-user@example.edu',
      role,
    });
  }
});
