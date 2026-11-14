import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthStateStore } from './auth-state.store';
import { UserRole } from '../models/auth.models';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthStateStore);
  const router = inject(Router);
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  return true;
};

export function roleGuard(requiredRole: UserRole.Student | UserRole.PlacementOfficer): CanActivateFn {
  return () => {
    const auth = inject(AuthStateStore);
    const router = inject(Router);
    const user = auth.user();
    if (!user) return router.createUrlTree(['/login']);
    if (user.role === requiredRole) return true;
    return router.parseUrl(homeUrlForRole(user.role));
  };
}

export const loginGuard: CanActivateFn = () => {
  const auth = inject(AuthStateStore);
  const router = inject(Router);
  const user = auth.user();
  return user ? router.parseUrl(homeUrlForRole(user.role)) : true;
};

function homeUrlForRole(role: UserRole): string {
  if (role === UserRole.Student) return '/student/dashboard';
  if (role === UserRole.PlacementOfficer) return '/officer/dashboard';
  return '/access-denied';
}

export function postLoginUrl(returnUrl: string | null | undefined, role: UserRole): string {
  const homeUrl = homeUrlForRole(role);
  const rolePrefix = role === UserRole.Student ? '/student'
    : role === UserRole.PlacementOfficer ? '/officer' : null;
  if (!returnUrl || !rolePrefix || !isInternalRoute(returnUrl)) return homeUrl;

  const parsed = new URL(returnUrl, 'https://campusflow.invalid');
  const isRoleRoute = parsed.pathname === rolePrefix || parsed.pathname.startsWith(`${rolePrefix}/`);
  return isRoleRoute ? `${parsed.pathname}${parsed.search}${parsed.hash}` : homeUrl;
}

function isInternalRoute(candidate: string): boolean {
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')
      || /[\u0000-\u001f\u007f]/.test(candidate) || /%(?![\da-f]{2})/i.test(candidate)) {
    return false;
  }

  try {
    const parsed = new URL(candidate, 'https://campusflow.invalid');
    return parsed.origin === 'https://campusflow.invalid'
      && parsed.username === ''
      && parsed.password === '';
  } catch {
    return false;
  }
}
