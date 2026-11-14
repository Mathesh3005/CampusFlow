import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStateStore } from '../auth/auth-state.store';
import { toApiError } from './api-error.handler';

export const apiInterceptor: HttpInterceptorFn = (request, next) => {
  const authState = inject(AuthStateStore);
  const targetsApi = isCampusFlowApiRequest(request.url);
  const token = targetsApi ? authState.accessToken : null;
  const outgoing = token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;

  return next(outgoing).pipe(catchError((error: unknown) => {
    if (!targetsApi) return throwError(() => error);
    if (error instanceof HttpErrorResponse) {
      const apiError = toApiError(error);
      if (apiError.status === 401) authState.clear();
      return throwError(() => apiError);
    }
    return throwError(() => error);
  }));
};

function isCampusFlowApiRequest(requestUrl: string): boolean {
  const request = new URL(requestUrl, getBrowserOrigin());
  const api = new URL(environment.apiBaseUrl, getBrowserOrigin());
  if (request.origin !== api.origin) return false;

  const apiPath = normalizePath(api.pathname);
  const requestPath = normalizePath(request.pathname);
  return apiPath === '/' || requestPath === apiPath || requestPath.startsWith(`${apiPath}/`);
}

function normalizePath(path: string): string {
  const withoutTrailingSlashes = path.replace(/\/+$/, '');
  return withoutTrailingSlashes || '/';
}

function getBrowserOrigin(): string {
  return typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
}
