import { HttpClient, HttpParams } from '@angular/common/http';
import { InjectionToken, Signal, signal } from '@angular/core';
import { Observable, finalize, map, shareReplay, tap, throwError } from 'rxjs';
import {
  NotificationQuery,
  NotificationResponse,
  PageResponse,
} from '../../../core/models/domain.models';

export const NOTIFICATIONS_PAGE_SIZE = 20;
export const NOTIFICATIONS_DEFAULT_SORT = 'createdAt,desc';

export interface NotificationsApi {
  readonly unreadOnLatestPage: Signal<number | null>;
  refreshUnreadCount(): Observable<number>;
  listNotifications(query?: NotificationQuery, refresh?: boolean): Observable<PageResponse<NotificationResponse>>;
  getNotification(id: number): Observable<NotificationResponse>;
  markNotificationRead(id: number): Observable<NotificationResponse>;
  markAllNotificationsRead(): Observable<void>;
  deleteNotification(id: number): Observable<void>;
}

export const NOTIFICATIONS_API = new InjectionToken<NotificationsApi>('NOTIFICATIONS_API');

export abstract class NotificationsApiClient implements NotificationsApi {
  private readonly unreadCount = signal<number | null>(null);
  readonly unreadOnLatestPage = this.unreadCount.asReadonly();

  private readonly inFlightPages = new Map<string, Observable<PageResponse<NotificationResponse>>>();
  private readonly latestPageReadState = new Map<number, boolean>();

  protected constructor(
    private readonly http: HttpClient,
    private readonly baseUrl: string,
  ) {}

  refreshUnreadCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/unread-count`).pipe(
      tap(response => this.unreadCount.set(response.count)),
      map(response => response.count),
    );
  }

  listNotifications(
    query: NotificationQuery = {},
    refresh = false,
  ): Observable<PageResponse<NotificationResponse>> {
    const page = query.page ?? 0;
    const size = query.size ?? NOTIFICATIONS_PAGE_SIZE;
    const sort = query.sort ?? NOTIFICATIONS_DEFAULT_SORT;
    if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1) {
      return throwError(() => new RangeError('Notification page and size must be valid positive values.'));
    }

    const key = `${page}:${size}:${sort}`;
    const inFlight = this.inFlightPages.get(key);
    if (!refresh && inFlight) return inFlight;

    const params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size))
      .set('sort', sort);
    let request$: Observable<PageResponse<NotificationResponse>>;
    request$ = this.http.get<PageResponse<NotificationResponse>>(this.baseUrl, { params }).pipe(
      tap(result => {
        if (page === 0) this.recordLatestPage(result.content);
      }),
      finalize(() => {
        if (this.inFlightPages.get(key) === request$) this.inFlightPages.delete(key);
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.inFlightPages.set(key, request$);
    return request$;
  }

  getNotification(id: number): Observable<NotificationResponse> {
    if (!this.isValidId(id)) return this.invalidId();
    return this.http.get<NotificationResponse>(`${this.baseUrl}/${id}`).pipe(
      tap(notification => this.recordReadState(notification)),
    );
  }

  markNotificationRead(id: number): Observable<NotificationResponse> {
    if (!this.isValidId(id)) return this.invalidId();
    return this.http.patch<NotificationResponse>(`${this.baseUrl}/${id}/read`, null).pipe(
      tap(notification => {
        this.recordReadState(notification);
      }),
    );
  }

  markAllNotificationsRead(): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/read-all`, null).pipe(
      tap(() => {
        for (const id of this.latestPageReadState.keys()) this.latestPageReadState.set(id, true);
        this.unreadCount.set(0);
      }),
    );
  }

  deleteNotification(id: number): Observable<void> {
    if (!this.isValidId(id)) return this.invalidId();
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => {
        const wasUnread = this.latestPageReadState.get(id) === false;
        this.latestPageReadState.delete(id);
        if (wasUnread && this.unreadCount() !== null) {
          this.unreadCount.update(count => Math.max(0, (count ?? 0) - 1));
        }
      }),
    );
  }

  private recordLatestPage(notifications: NotificationResponse[]): void {
    this.latestPageReadState.clear();
    for (const notification of notifications) {
      this.latestPageReadState.set(notification.id, notification.isRead);
    }
    this.unreadCount.set(notifications.filter(notification => !notification.isRead).length);
  }

  private recordReadState(notification: NotificationResponse): void {
    const previousState = this.latestPageReadState.get(notification.id);
    if (previousState === false && notification.isRead && this.unreadCount() !== null) {
      this.unreadCount.update(count => Math.max(0, (count ?? 0) - 1));
    }
    if (previousState !== undefined) this.latestPageReadState.set(notification.id, notification.isRead);
  }

  private isValidId(id: number): boolean {
    return Number.isInteger(id) && id > 0;
  }

  private invalidId<T>(): Observable<T> {
    return throwError(() => new RangeError('Notification ID must be a positive integer.'));
  }
}
