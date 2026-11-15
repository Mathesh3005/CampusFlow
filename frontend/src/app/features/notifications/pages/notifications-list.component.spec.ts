import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { ApiError } from '../../../core/http/api-error.handler';
import { NotificationResponse, NotificationType, PageResponse } from '../../../core/models/domain.models';
import { NOTIFICATIONS_API, NotificationsApi } from '../services/notification-api';
import { NotificationsList } from './notifications-list.component';

describe('NotificationsList', () => {
  it('loads the latest page and displays unread state with links to details', () => {
    const listNotifications = vi.fn(() => of(page([notification(5, false)])));
    const fixture = createFixture('student', { listNotifications });
    fixture.detectChanges();

    expect(listNotifications).toHaveBeenCalledWith(
      { page: 0, size: 20, sort: 'createdAt,desc' },
      false,
    );
    expect(fixture.nativeElement.textContent).toContain('New interview schedule');
    expect(fixture.nativeElement.textContent).toContain('Unread');
    expect(fixture.nativeElement.querySelector('a[href="/student/notifications/5"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('time')?.getAttribute('aria-label')).toContain('2026');
  });

  it('shows loading and empty states', () => {
    const response = new Subject<PageResponse<NotificationResponse>>();
    const fixture = createFixture('officer', {
      listNotifications: vi.fn(() => response.asObservable()),
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading notifications');

    response.next(page([], 0));
    response.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('You’re all caught up');
  });

  it('paginates through server pages and refreshes the current page', () => {
    const listNotifications = vi.fn()
      .mockReturnValueOnce(of(page([notification(1, true)], 21, 0)))
      .mockReturnValueOnce(of(page([notification(21, false)], 21, 1)))
      .mockReturnValueOnce(of(page([notification(21, false)], 21, 1)));
    const fixture = createFixture('student', { listNotifications });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.pagination button:last-child') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(listNotifications).toHaveBeenCalledTimes(2);
    expect(listNotifications).toHaveBeenLastCalledWith(
      { page: 1, size: 20, sort: 'createdAt,desc' },
      false,
    );
    expect(fixture.nativeElement.textContent).toContain('Page 2 of 2');
    expect(fixture.nativeElement.querySelector('a[href="/student/notifications/21"]')).not.toBeNull();

    (fixture.nativeElement.querySelector('.page-heading .secondary-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(listNotifications).toHaveBeenLastCalledWith(
      { page: 1, size: 20, sort: 'createdAt,desc' },
      true,
    );
  });

  it('marks individual notifications and all notifications as read', () => {
    const markNotificationRead = vi.fn((id: number) => of(notification(id, true)));
    const markAllNotificationsRead = vi.fn(() => of(void 0));
    const fixture = createFixture('officer', {
      listNotifications: vi.fn(() => of(page([notification(5, false), notification(6, false)]))),
      markNotificationRead,
      markAllNotificationsRead,
    });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.text-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(markNotificationRead).toHaveBeenCalledWith(5);
    expect(fixture.nativeElement.textContent).toContain('Notification marked as read.');
    expect(fixture.nativeElement.querySelector('.notification-row.unread')).not.toBeNull();

    (fixture.nativeElement.querySelector('.heading-actions .primary-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(markAllNotificationsRead).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('.notification-row.unread')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('All notifications have been marked as read.');
  });

  it('prevents duplicate read requests while the request is pending', () => {
    const response = new Subject<NotificationResponse>();
    const markNotificationRead = vi.fn(() => response.asObservable());
    const fixture = createFixture('student', {
      listNotifications: vi.fn(() => of(page([notification(5, false)]))),
      markNotificationRead,
    });
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.text-button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    button.click();
    expect(markNotificationRead).toHaveBeenCalledTimes(1);
    expect(button.disabled).toBe(true);
    response.next(notification(5, true));
    response.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Read');
  });

  it('requires confirmation before deletion and removes the item after success', () => {
    const deleteNotification = vi.fn(() => of(void 0));
    const fixture = createFixture('student', {
      listNotifications: vi.fn(() => of(page([notification(5, false)]))),
      deleteNotification,
      confirmed: true,
    });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.icon-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.dialog.open).toHaveBeenCalled();
    expect(deleteNotification).toHaveBeenCalledWith(5);
    expect(fixture.nativeElement.textContent).toContain('Notification deleted.');
    expect(fixture.nativeElement.textContent).toContain('You’re all caught up');
  });

  it('does not delete when the confirmation is declined', () => {
    const deleteNotification = vi.fn(() => of(void 0));
    const fixture = createFixture('student', {
      listNotifications: vi.fn(() => of(page([notification(5, false)]))),
      deleteNotification,
      confirmed: false,
    });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.icon-button') as HTMLButtonElement).click();
    expect(deleteNotification).not.toHaveBeenCalled();
  });

  it.each([
    [400, 'request was invalid'],
    [401, 'session has expired'],
    [403, 'permission to access'],
    [404, 'no longer available'],
    [409, 'may have changed'],
    [503, 'temporarily unavailable'],
  ])('handles notification list HTTP %s with recovery feedback', (status, message) => {
    const listNotifications = vi.fn()
      .mockReturnValueOnce(throwError(() => new ApiError(status, 'other', { status })))
      .mockReturnValueOnce(of(page([], 0)));
    const fixture = createFixture('student', { listNotifications });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(message);
    (fixture.nativeElement.querySelector('.error-state .primary-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(listNotifications).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('You’re all caught up');
  });
});

interface TestOverrides {
  listNotifications?: NotificationsApi['listNotifications'];
  getNotification?: NotificationsApi['getNotification'];
  markNotificationRead?: NotificationsApi['markNotificationRead'];
  markAllNotificationsRead?: NotificationsApi['markAllNotificationsRead'];
  deleteNotification?: NotificationsApi['deleteNotification'];
  confirmed?: boolean;
}

function createFixture(workspace: string, overrides: TestOverrides = {}) {
  const api: NotificationsApi = {
    unreadOnLatestPage: signal<number | null>(0).asReadonly(),
    listNotifications: overrides.listNotifications ?? (() => of(page([notification(5, false)]))),
    getNotification: overrides.getNotification ?? (() => of(notification(5, false))),
    markNotificationRead: overrides.markNotificationRead ?? (id => of(notification(id, true))),
    markAllNotificationsRead: overrides.markAllNotificationsRead ?? (() => of(void 0)),
    deleteNotification: overrides.deleteNotification ?? (() => of(void 0)),
  };
  const dialog = {
    open: vi.fn(() => ({ afterClosed: () => of(overrides.confirmed ?? false) })),
  };
  TestBed.configureTestingModule({
    imports: [NotificationsList],
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { data: { notificationWorkspace: workspace } } } },
      { provide: NOTIFICATIONS_API, useValue: api },
    ],
  });
  TestBed.overrideProvider(MatDialog, { useValue: dialog });
  const fixture = TestBed.createComponent(NotificationsList);
  return Object.assign(fixture, { dialog });
}

function notification(id: number, isRead: boolean): NotificationResponse {
  return {
    id,
    userId: 7,
    title: 'New interview schedule',
    message: 'Your interview details have been updated.',
    notificationType: NotificationType.Interview,
    isRead,
    createdAt: '2026-11-15T10:00:00Z',
  };
}

function page(
  content: NotificationResponse[],
  totalElements = content.length,
  pageNumber = 0,
): PageResponse<NotificationResponse> {
  const totalPages = Math.ceil(totalElements / 20);
  return {
    content,
    page: pageNumber,
    size: 20,
    totalElements,
    totalPages,
    first: pageNumber === 0,
    last: pageNumber >= totalPages - 1,
    hasNext: pageNumber < totalPages - 1,
    hasPrevious: pageNumber > 0,
  };
}
