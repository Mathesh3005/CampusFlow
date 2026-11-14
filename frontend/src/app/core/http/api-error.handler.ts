import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorKind, ApiProblemDetail } from '../models/api-error.model';

export class ApiError extends Error {
  constructor(readonly status: number, readonly kind: ApiErrorKind, readonly problem: ApiProblemDetail | null) {
    super(problem?.detail ?? problem?.title ?? `Request failed (${status})`);
    this.name = 'ApiError';
  }
}

export function toApiError(error: HttpErrorResponse): ApiError {
  const body = isProblemDetail(error.error) ? error.error : null;
  const kind: ApiErrorKind = error.status === 400 ? 'validation'
    : error.status === 401 ? 'unauthorized'
    : error.status === 403 ? 'forbidden'
    : error.status === 404 ? 'notFound'
    : error.status === 409 ? 'conflict'
    : error.status === 413 ? 'tooLarge'
    : error.status >= 500 ? 'server' : 'other';
  return new ApiError(error.status, kind, body);
}

function isProblemDetail(value: unknown): value is ApiProblemDetail {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
