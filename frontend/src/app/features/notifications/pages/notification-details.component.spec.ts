import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { ApiError } from '../../../core/http/api-error.handler';
import { NotificationResponse, NotificationType } from '../../../core/models/domain.models';
import { NOTIFICATIONS_API, NotificationsApi } from '../services/notification-api';
import { NotificationDetails } from './notification-details.component';

describe('NotificationDetails', () => {
  it('shows a notification detail with timestamp and read status', () => {
    const getNotification = vi.fn(() => of(notification(42, false)));
    const fixture = createFixture('42', 'student', { getNotification });
    fixture.detectChanges();

    expect(getNotification).toHaveBeenCalledWith(42);
    expect(fixture.nativeElement.textContent).toContain('Interview schedule');
    expect(fixture.nativeElement.textContent).toContain('Your interview is tomorrow.');
    expect(fixture.nativeElement.textContent).toContain('Unread');
    expect(fixture.nativeElement.querySelector('time')?.getAttribute('aria-label')).toContain('2026');
  });

  it.each(['abc', '1e2', '0', '-1', '9007199254740992'])(
    'rejects invalid ID %s without requesting the API',
    id => {
      const getNotification = vi.fn(() => of(notification(42, false)));
      const fixture = createFixture(id, 'student', { getNotification });
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Invalid notification');
      expect(getNotification).not.toHaveBeenCalled();
    },
  );

  it('marks a notification as read and reflects the API response', () => {
    const markNotificationRead = vi.fn(() => of(notification(42, true)));
    const fixture = createFixture('42', 'officer', { markNotificationRead });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.primary-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(markNotificationRead).toHaveBeenCalledWith(42);
    expect(fixture.nativeElement.textContent).toContain('Notification marked as read.');
    expect(fixture.nativeElement.textContent).toContain('Read');
    expect(fixture.nativeElement.querySelector('.primary-button')).toBeNull();
  });

  it('prevents duplicate read requests while a read is pending', () => {
    const response = new Subject<NotificationResponse>();
    const markNotificationRead = vi.fn(() => response.asObservable());
    const fixture = createFixture('42', 'student', { markNotificationRead });
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.primary-button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    button.click();
    expect(markNotificationRead).toHaveBeenCalledTimes(1);
    expect(button.disabled).toBe(true);
    response.next(notification(42, true));
    response.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Read');
  });

  it('confirms deletion before showing the deleted state', () => {
    const deleteNotification = vi.fn(() => of(void 0));
    const fixture = createFixture('42', 'student', { deleteNotification, confirmed: true });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.delete-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.dialog.open).toHaveBeenCalled();
    expect(deleteNotification).toHaveBeenCalledWith(42);
    expect(fixture.nativeElement.textContent).toContain('Notification deleted');
    expect(fixture.nativeElement.querySelector('a[href="/student/notifications"]')).not.toBeNull();
  });

  it('does not delete when confirmation is declined', () => {
    const deleteNotification = vi.fn(() => of(void 0));
    const fixture = createFixture('42', 'student', { deleteNotification, confirmed: false });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.delete-button') as HTMLButtonElement).click();
    expect(deleteNotification).not.toHaveBeenCalled();
  });

  it.each([
    [400, 'request was invalid'],
    [401, 'session has expired'],
    [403, 'permission to access'],
    [404, 'no longer available'],
    [409, 'may have changed'],
    [500, 'temporarily unavailable'],
  ])('handles API error %s and offers retry', (status, message) => {
    const getNotification = vi.fn()
      .mockReturnValueOnce(throwError(() => new ApiError(status, 'other', { status })))
      .mockReturnValueOnce(of(notification(42, true)));
    const fixture = createFixture('42', 'officer', { getNotification });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(message);
    (fixture.nativeElement.querySelector('.primary-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(getNotification).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('Interview schedule');
  });
});

interface TestOverrides {
  getNotification?: NotificationsApi['getNotification'];
  markNotificationRead?: NotificationsApi['markNotificationRead'];
  deleteNotification?: NotificationsApi['deleteNotification'];
  confirmed?: boolean;
}

function createFixture(id: string, workspace: string, overrides: TestOverrides = {}) {
  const api: NotificationsApi = {
    unreadOnLatestPage: signal<number | null>(0).asReadonly(),
    listNotifications: () => of({
      content: [], page: 0, size: 20, totalElements: 0, totalPages: 0,
      first: true, last: true, hasNext: false, hasPrevious: false,
    }),
    getNotification: overrides.getNotification ?? (() => of(notification(42, false))),
    markNotificationRead: overrides.markNotificationRead ?? (() => of(notification(42, true))),
    markAllNotificationsRead: () => of(void 0),
    deleteNotification: overrides.deleteNotification ?? (() => of(void 0)),
  };
  const paramMap = convertToParamMap({ id });
  const dialog = {
    open: vi.fn(() => ({ afterClosed: () => of(overrides.confirmed ?? false) })),
  };
  TestBed.configureTestingModule({
    imports: [NotificationDetails],
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap, data: { notificationWorkspace: workspace } } } },
      { provide: NOTIFICATIONS_API, useValue: api },
    ],
  });
  TestBed.overrideProvider(MatDialog, { useValue: dialog });
  const fixture = TestBed.createComponent(NotificationDetails);
  return Object.assign(fixture, { dialog });
}

function notification(id: number, isRead: boolean): NotificationResponse {
  return {
    id,
    userId: 9,
    title: 'Interview schedule',
    message: 'Your interview is tomorrow.',
    notificationType: NotificationType.Interview,
    isRead,
    createdAt: '2026-11-15T10:00:00Z',
  };
}
