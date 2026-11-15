import { NotificationType } from '../../core/models/domain.models';

const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function relativeNotificationTime(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Date unavailable';

  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];
  for (const [unit, duration] of units) {
    if (Math.abs(seconds) >= duration) return relativeTime.format(Math.round(seconds / duration), unit);
  }
  return relativeTime.format(seconds, 'second');
}

export function notificationIcon(type: NotificationType): string {
  switch (type) {
    case NotificationType.JobUpdate: return 'work_outline';
    case NotificationType.ApplicationUpdate: return 'description';
    case NotificationType.Interview: return 'event';
    case NotificationType.System: return 'info_outline';
  }
}
