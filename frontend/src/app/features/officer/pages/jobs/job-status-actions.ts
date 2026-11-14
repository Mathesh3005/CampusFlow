import { ApiError } from '../../../../core/http/api-error.handler';

export type JobStatusAction = 'publish' | 'close';

export function jobStatusActionErrorMessage(error: unknown, action: JobStatusAction): string {
  if (!(error instanceof ApiError)) {
    return `The job could not be ${action === 'publish' ? 'published' : 'closed'}. Please try again.`;
  }
  if (error.status === 400) {
    return action === 'publish'
      ? 'This job cannot be published. Check that its application deadline is in the future.'
      : 'This job cannot be closed in its current state.';
  }
  if (error.status === 401) return 'Your session has expired. Sign in again to manage this job.';
  if (error.status === 403) return 'You do not have permission to change this job.';
  if (error.status === 404) return 'This job could not be found. Its displayed data has been refreshed.';
  if (error.status === 409) return 'The job status changed before the action completed. Its displayed data has been refreshed.';
  if (error.status >= 500) return 'The server could not update this job. Please try again.';

  return `The job could not be ${action === 'publish' ? 'published' : 'closed'}. Please try again.`;
}

export function jobDeleteErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'The job could not be deleted. Please try again.';
  if (error.status === 401) return 'Your session has expired. Sign in again to manage this job.';
  if (error.status === 403) return 'You do not have permission to delete this job.';
  if (error.status === 404) return 'This job could not be found. Its displayed data has been refreshed.';
  if (error.status === 409) return 'This job is no longer a draft and cannot be deleted. Its displayed data has been refreshed.';
  if (error.status >= 500) return 'The server could not delete this job. Please try again.';
  return 'The job could not be deleted. Please try again.';
}
