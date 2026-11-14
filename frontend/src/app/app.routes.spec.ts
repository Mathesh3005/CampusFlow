import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthStateStore } from './core/auth/auth-state.store';
import { UserRole } from './core/models/auth.models';
import { routes } from './app.routes';

describe('application route configuration', () => {
  let auth: AuthStateStore;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    auth = TestBed.inject(AuthStateStore);
    router = TestBed.inject(Router);
  });

  afterEach(() => auth.clear());

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
    await harness.navigateByUrl('/officer/interviews');
    expect(router.url).toBe('/student/dashboard');
  });

  it('allows an officer to navigate directly to an officer route', async () => {
    setUser(UserRole.PlacementOfficer);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/officer/interviews');
    expect(router.url).toBe('/officer/interviews');
    expect(harness.routeNativeElement?.textContent).toContain('Interviews');
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
