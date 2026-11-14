import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthStateStore } from './auth-state.store';
import { authGuard, loginGuard, postLoginUrl, roleGuard } from './auth.guards';
import { UserRole } from '../models/auth.models';

describe('authentication route guards', () => {
  let auth: AuthStateStore;
  let router: Router;
  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/' } as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    auth = TestBed.inject(AuthStateStore);
    router = TestBed.inject(Router);
  });

  afterEach(() => auth.clear());

  it('redirects unauthenticated users to login with their requested route', () => {
    const result = TestBed.runInInjectionContext(() => authGuard(route, { url: '/student/jobs' } as RouterStateSnapshot));
    expect(router.serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Fstudent%2Fjobs');
  });

  it('redirects a student away from officer routes to the student dashboard', () => {
    setUser(UserRole.Student);
    const result = TestBed.runInInjectionContext(() => roleGuard(UserRole.PlacementOfficer)(route, state));
    expect(router.serializeUrl(result as UrlTree)).toBe('/student/dashboard');
  });

  it('redirects an officer away from student routes to the officer dashboard', () => {
    setUser(UserRole.PlacementOfficer);
    const result = TestBed.runInInjectionContext(() => roleGuard(UserRole.Student)(route, state));
    expect(router.serializeUrl(result as UrlTree)).toBe('/officer/dashboard');
  });

  it('redirects signed-in users away from login to their role home', () => {
    setUser(UserRole.Student);
    const result = TestBed.runInInjectionContext(() => loginGuard(route, state));
    expect(router.serializeUrl(result as UrlTree)).toBe('/student/dashboard');
  });

  it('sends unsupported roles to the safe access-denied route', () => {
    setUser(UserRole.Admin);
    const result = TestBed.runInInjectionContext(() => loginGuard(route, state));
    expect(router.serializeUrl(result as UrlTree)).toBe('/access-denied');
  });

  it('preserves a valid student deep link including query and fragment', () => {
    expect(postLoginUrl('/student/jobs?page=2#saved', UserRole.Student))
      .toBe('/student/jobs?page=2#saved');
  });

  it('preserves a valid officer deep link', () => {
    expect(postLoginUrl('/officer/applications/42', UserRole.PlacementOfficer))
      .toBe('/officer/applications/42');
  });

  it('falls back to the role dashboard for cross-role return URLs', () => {
    expect(postLoginUrl('/officer/jobs', UserRole.Student)).toBe('/student/dashboard');
    expect(postLoginUrl('/student/jobs', UserRole.PlacementOfficer)).toBe('/officer/dashboard');
  });

  it('rejects external and protocol-relative return URLs', () => {
    expect(postLoginUrl('https://attacker.example/path', UserRole.Student)).toBe('/student/dashboard');
    expect(postLoginUrl('//attacker.example/path', UserRole.Student)).toBe('/student/dashboard');
  });

  it('rejects malformed return URLs', () => {
    expect(postLoginUrl('/student/%broken', UserRole.Student)).toBe('/student/dashboard');
    expect(postLoginUrl('/student/\\\\attacker.example', UserRole.Student)).toBe('/student/dashboard');
  });

  it('falls back to the role dashboard when return URL is missing', () => {
    expect(postLoginUrl(null, UserRole.Student)).toBe('/student/dashboard');
    expect(postLoginUrl(undefined, UserRole.PlacementOfficer)).toBe('/officer/dashboard');
  });

  function setUser(role: UserRole): void {
    auth.setSession({
      accessToken: 'guard-test-token',
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      userId: 3,
      email: 'user@example.edu',
      role,
    });
  }
});
