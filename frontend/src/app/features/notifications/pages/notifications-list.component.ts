import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, map, of, switchMap } from 'rxjs';
import { ApiError } from '../../../core/http/api-error.handler';
import { NotificationResponse, PageResponse } from '../../../core/models/domain.models';
import { NOTIFICATIONS_API, NOTIFICATIONS_DEFAULT_SORT, NOTIFICATIONS_PAGE_SIZE } from '../services/notification-api';
import { notificationErrorMessage } from '../notification-error';
import { notificationIcon, relativeNotificationTime } from '../notification-time';
import { NotificationDeleteConfirmationDialog } from './notification-delete-confirmation-dialog.component';

type NotificationListState =
  | { status: 'loading' }
  | { status: 'ready'; page: PageResponse<NotificationResponse> }
  | { status: 'error'; message: string; unauthorized: boolean };

interface PageRequest {
  page: number;
  refresh: boolean;
}

@Component({
  selector: 'app-notifications-list',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatIconModule, RouterLink],
  templateUrl: './notifications-list.component.html',
  styleUrl: './notifications-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsList implements OnInit {
  private readonly api = inject(NOTIFICATIONS_API);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly pageRequests = new Subject<PageRequest>();

  readonly pageSize = NOTIFICATIONS_PAGE_SIZE;
  readonly pageIndex = signal(0);
  readonly state = signal<NotificationListState>({ status: 'loading' });
  readonly pendingAction = signal<'read-all' | 'confirm-delete' | number | null>(null);
  readonly actionMessage = signal<string | null>(null);
  readonly actionError = signal(false);
  readonly workspace = this.route.snapshot.data['notificationWorkspace'] as string;
  readonly notificationIcon = notificationIcon;
  readonly relativeTime = relativeNotificationTime;

  ngOnInit(): void {
    this.pageRequests.pipe(
      switchMap(request => {
        this.state.set({ status: 'loading' });
        return this.api.listNotifications({
          page: request.page,
          size: this.pageSize,
          sort: NOTIFICATIONS_DEFAULT_SORT,
        }, request.refresh).pipe(
          map(page => ({ status: 'ready' as const, page })),
          catchError((error: unknown) => of({
            status: 'error' as const,
            message: notificationErrorMessage(error),
            unauthorized: error instanceof ApiError && error.status === 401,
          })),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(result => {
      if (result.status === 'ready' && result.page.totalPages > 0 && result.page.page >= result.page.totalPages) {
        this.pageIndex.set(result.page.totalPages - 1);
        this.load(true);
        return;
      }
      this.state.set(result);
    });
    this.load();
  }

  load(refresh = false): void {
    this.actionMessage.set(null);
    this.actionError.set(false);
    this.pageRequests.next({ page: this.pageIndex(), refresh });
  }

  changePage(page: number): void {
    const current = this.state();
    if (current.status !== 'ready'
      || !Number.isInteger(page)
      || page < 0
      || page >= current.page.totalPages
      || page === this.pageIndex()) return;
    this.pageIndex.set(page);
    this.load();
  }

  markRead(notification: NotificationResponse): void {
    if (notification.isRead || this.pendingAction() !== null) return;
    this.pendingAction.set(notification.id);
    this.api.markNotificationRead(notification.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: updated => {
        this.updateCurrentPage(updated);
        this.pendingAction.set(null);
        this.actionMessage.set('Notification marked as read.');
        this.actionError.set(false);
      },
      error: error => {
        this.pendingAction.set(null);
        this.actionMessage.set(notificationErrorMessage(error));
        this.actionError.set(true);
      },
    });
  }

  markAllRead(): void {
    const current = this.state();
    if (current.status !== 'ready' || this.pendingAction() !== null
      || !current.page.content.some(notification => !notification.isRead)) return;
    this.pendingAction.set('read-all');
    this.api.markAllNotificationsRead().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        const latest = this.state();
        if (latest.status === 'ready') {
          this.state.set({
            status: 'ready',
            page: { ...latest.page, content: latest.page.content.map(notification => ({ ...notification, isRead: true })) },
          });
        }
        this.pendingAction.set(null);
        this.actionMessage.set('All notifications have been marked as read.');
        this.actionError.set(false);
      },
      error: error => {
        this.pendingAction.set(null);
        this.actionMessage.set(notificationErrorMessage(error));
        this.actionError.set(true);
      },
    });
  }

  confirmDelete(notification: NotificationResponse): void {
    if (this.pendingAction() !== null) return;
    this.pendingAction.set('confirm-delete');
    this.dialog.open(NotificationDeleteConfirmationDialog, {
      data: { title: notification.title },
      ariaLabel: 'Confirm notification deletion',
    }).afterClosed().pipe(
      takeUntilDestroyed(this.destroyRef),
      switchMap(confirmed => {
        if (confirmed !== true) {
          this.pendingAction.set(null);
          return EMPTY;
        }
        this.pendingAction.set(notification.id);
        return this.api.deleteNotification(notification.id).pipe(
          map(() => ({ success: true as const })),
          catchError((error: unknown) => of({ success: false as const, error })),
        );
      }),
    ).subscribe(result => {
      this.pendingAction.set(null);
      if (!result.success) {
        this.actionMessage.set(notificationErrorMessage(result.error));
        this.actionError.set(true);
        return;
      }
      this.actionMessage.set('Notification deleted.');
      this.actionError.set(false);
      const current = this.state();
      if (current.status !== 'ready') return;
      const remaining = current.page.content.filter(item => item.id !== notification.id);
      const totalElements = Math.max(0, current.page.totalElements - 1);
      const totalPages = Math.ceil(totalElements / this.pageSize);
      if (totalPages > 0 && this.pageIndex() >= totalPages) {
        this.pageIndex.set(totalPages - 1);
        this.load(true);
        return;
      }
      this.state.set({
        status: 'ready',
        page: {
          ...current.page,
          content: remaining,
          totalElements,
          totalPages,
          first: this.pageIndex() === 0,
          last: totalPages === 0 || this.pageIndex() >= totalPages - 1,
          hasNext: this.pageIndex() < totalPages - 1,
          hasPrevious: this.pageIndex() > 0,
        },
      });
    });
  }

  private updateCurrentPage(updated: NotificationResponse): void {
    const current = this.state();
    if (current.status !== 'ready') return;
    this.state.set({
      status: 'ready',
      page: { ...current.page, content: current.page.content.map(item => item.id === updated.id ? updated : item) },
    });
  }
}
