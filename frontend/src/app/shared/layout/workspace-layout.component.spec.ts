import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NOTIFICATIONS_API, NotificationsApi } from '../../features/notifications/services/notification-api';
import { WorkspaceLayout } from './workspace-layout.component';

describe('WorkspaceLayout mobile navigation', () => {
  const unreadCount = signal<number | null>(2);

  beforeEach(() => {
    unreadCount.set(2);
    TestBed.configureTestingModule({
      imports: [WorkspaceLayout],
      providers: [
        provideRouter([]),
        {
          provide: NOTIFICATIONS_API,
          useValue: {
            unreadOnLatestPage: unreadCount.asReadonly(),
            listNotifications: () => of(emptyPage),
            getNotification: () => of(notification),
            markNotificationRead: () => of(notification),
            markAllNotificationsRead: () => of(void 0),
            deleteNotification: () => of(void 0),
          } satisfies NotificationsApi,
        },
      ],
    });
  });

  it('exposes the collapsed state and moves focus into the sidebar when opened', () => {
    const fixture = TestBed.createComponent(WorkspaceLayout);
    fixture.detectChanges();
    const toggle = fixture.nativeElement.querySelector('.menu-toggle') as HTMLButtonElement;
    const sidebar = fixture.nativeElement.querySelector('#workspace-sidebar') as HTMLElement;

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe('workspace-sidebar');
    toggle.click();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(sidebar.classList.contains('workspace-sidebar')).toBe(true);
    expect(fixture.nativeElement.ownerDocument.activeElement?.classList.contains('navigation-link')).toBe(true);
  });

  it('closes on Escape and restores focus to the sidebar toggle', () => {
    const fixture = TestBed.createComponent(WorkspaceLayout);
    fixture.detectChanges();
    const toggle = fixture.nativeElement.querySelector('.menu-toggle') as HTMLButtonElement;
    const firstLink = fixture.nativeElement.querySelector('.navigation-link') as HTMLAnchorElement;
    toggle.style.display = 'block';
    toggle.click();
    fixture.detectChanges();

    firstLink.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.ownerDocument.activeElement).toBe(toggle);
  });

  it('shows the scoped latest-page unread count in navigation', () => {
    const fixture = TestBed.createComponent(WorkspaceLayout);
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('.navigation-unread-badge') as HTMLElement;
    expect(badge.textContent.trim()).toBe('2');
    expect(badge.getAttribute('aria-label')).toBe('2 unread on latest page');
    unreadCount.set(1);
    fixture.detectChanges();
    expect(badge.textContent.trim()).toBe('1');
  });

  it('keeps navigation available when the unread summary request fails', () => {
    const unavailableApi = {
      unreadOnLatestPage: signal<number | null>(null).asReadonly(),
      listNotifications: () => throwError(() => new Error('Offline')),
      getNotification: () => of(notification),
      markNotificationRead: () => of(notification),
      markAllNotificationsRead: () => of(void 0),
      deleteNotification: () => of(void 0),
    } satisfies NotificationsApi;
    TestBed.overrideProvider(NOTIFICATIONS_API, { useValue: unavailableApi });
    const fixture = TestBed.createComponent(WorkspaceLayout);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.navigation-link')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Unread status unavailable');
    expect(fixture.nativeElement.querySelector('.navigation-unread-badge')).toBeNull();
  });
});

import { NotificationResponse, NotificationType, PageResponse } from '../../core/models/domain.models';

const notification: NotificationResponse = {
  id: 1, userId: 7, title: 'Update', message: 'A new update is available.',
  notificationType: NotificationType.System, isRead: false, createdAt: '2026-11-15T10:00:00Z',
};
const emptyPage: PageResponse<NotificationResponse> = {
  content: [notification], page: 0, size: 20, totalElements: 1, totalPages: 1,
  first: true, last: true, hasNext: false, hasPrevious: false,
};
