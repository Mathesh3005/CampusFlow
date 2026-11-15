import { ApiError } from '../../core/http/api-error.handler';

export function notificationErrorMessage(error: unknown): string {
  if (error instanceof RangeError) return 'The notification ID or page is invalid.';
  if (!(error instanceof ApiError)) return 'Notifications could not be updated. Please try again.';
  if (error.status === 400) return 'The notification request was invalid. Refresh and try again.';
  if (error.status === 401) return 'Your session has expired. Sign in again to manage notifications.';
  if (error.status === 403) return 'You do not have permission to access these notifications.';
  if (error.status === 404) return 'This notification is no longer available. Refresh the list.';
  if (error.status === 409) return 'This notification may have changed. Refresh and try again.';
  if (error.status >= 500) return 'The notification service is temporarily unavailable. Please try again.';
  return 'Notifications could not be updated. Please try again.';
}
