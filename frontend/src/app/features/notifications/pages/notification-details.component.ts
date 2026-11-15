import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, catchError, map, of, switchMap } from 'rxjs';
import { ApiError } from '../../../core/http/api-error.handler';
import { NotificationResponse } from '../../../core/models/domain.models';
import { notificationErrorMessage } from '../notification-error';
import { notificationIcon, relativeNotificationTime } from '../notification-time';
import { NOTIFICATIONS_API } from '../services/notification-api';
import { NotificationDeleteConfirmationDialog } from './notification-delete-confirmation-dialog.component';

type NotificationDetailsState =
  | { status: 'loading' }
  | { status: 'ready'; notification: NotificationResponse }
  | { status: 'error'; message: string; unauthorized: boolean }
  | { status: 'invalid' }
  | { status: 'deleted' };

@Component({
  selector: 'app-notification-details',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatIconModule, RouterLink],
  templateUrl: './notification-details.component.html',
  styleUrl: './notification-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationDetails implements OnInit {
  private readonly api = inject(NOTIFICATIONS_API);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);

  readonly state = signal<NotificationDetailsState>({ status: 'loading' });
  readonly pendingAction = signal<'read' | 'delete' | 'confirm-delete' | null>(null);
  readonly actionMessage = signal<string | null>(null);
  readonly actionError = signal(false);
  readonly workspace = this.route.snapshot.data['notificationWorkspace'] as string;
  readonly notificationIcon = notificationIcon;
  readonly relativeTime = relativeNotificationTime;
  private notificationId: number | null = null;

  ngOnInit(): void {
    const rawId = this.route.snapshot.paramMap.get('id');
    const id = rawId !== null && /^\d+$/.test(rawId) ? Number(rawId) : Number.NaN;
    if (!Number.isSafeInteger(id) || id < 1) {
      this.state.set({ status: 'invalid' });
      return;
    }
    this.notificationId = id;
    this.load();
  }

  load(): void {
    if (this.notificationId === null) {
      this.state.set({ status: 'invalid' });
      return;
    }
    this.state.set({ status: 'loading' });
    this.actionMessage.set(null);
    this.actionError.set(false);
    this.api.getNotification(this.notificationId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: notification => this.state.set({ status: 'ready', notification }),
      error: error => this.state.set({
        status: 'error',
        message: notificationErrorMessage(error),
        unauthorized: error instanceof ApiError && error.status === 401,
      }),
    });
  }

  markRead(): void {
    const current = this.state();
    if (current.status !== 'ready' || current.notification.isRead || this.pendingAction() !== null) return;
    this.pendingAction.set('read');
    this.api.markNotificationRead(current.notification.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: notification => {
        this.state.set({ status: 'ready', notification });
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

  confirmDelete(): void {
    const current = this.state();
    if (current.status !== 'ready' || this.pendingAction() !== null) return;
    this.pendingAction.set('confirm-delete');
    this.dialog.open(NotificationDeleteConfirmationDialog, {
      data: { title: current.notification.title },
      ariaLabel: 'Confirm notification deletion',
    }).afterClosed().pipe(
      takeUntilDestroyed(this.destroyRef),
      switchMap(confirmed => {
        if (confirmed !== true) {
          this.pendingAction.set(null);
          return EMPTY;
        }
        this.pendingAction.set('delete');
        return this.api.deleteNotification(current.notification.id).pipe(
          map(() => ({ success: true as const })),
          catchError((error: unknown) => of({ success: false as const, error })),
        );
      }),
    ).subscribe(result => {
      this.pendingAction.set(null);
      if (result.success) {
        this.state.set({ status: 'deleted' });
        this.actionMessage.set('Notification deleted.');
        this.actionError.set(false);
      } else {
        this.actionMessage.set(notificationErrorMessage(result.error));
        this.actionError.set(true);
      }
    });
  }
}
