import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { ApiError } from '../../../core/http/api-error.handler';
import { apiInterceptor } from '../../../core/http/api.interceptor';
import { NotificationResponse, NotificationType, PageResponse } from '../../../core/models/domain.models';
import { StudentNotificationsService } from './student-notifications.service';

describe('StudentNotificationsService', () => {
  let service: StudentNotificationsService;
  let requests: HttpTestingController;
  const root = `${environment.apiBaseUrl}/student/notifications`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        StudentNotificationsService,
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(StudentNotificationsService);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => requests.verify());

  it('lists the latest notifications using the backend paging contract', () => {
    let response: PageResponse<NotificationResponse> | undefined;
    service.listNotifications().subscribe(value => response = value);
    const request = requests.expectOne(`${root}?page=0&size=20&sort=createdAt,desc`);
    expect(request.request.method).toBe('GET');
    const result = page([notification(1, false), notification(2, true)]);
    request.flush(result);
    expect(response).toEqual(result);
    expect(service.unreadOnLatestPage()).toBe(1);
  });

  it('uses requested pagination and sorting', () => {
    service.listNotifications({ page: 2, size: 7, sort: 'createdAt,asc' }).subscribe();
    const request = requests.expectOne(`${root}?page=2&size=7&sort=createdAt,asc`);
    expect(request.request.method).toBe('GET');
    request.flush(page([], 0, 2, 7));
    expect(service.unreadOnLatestPage()).toBeNull();
  });

  it('gets details and marks the owned notification read without a payload', () => {
    service.listNotifications().subscribe();
    requests.expectOne(`${root}?page=0&size=20&sort=createdAt,desc`)
      .flush(page([notification(1, false)]));

    let response: NotificationResponse | undefined;
    service.getNotification(1).subscribe();
    const details = requests.expectOne(`${root}/1`);
    details.flush(notification(1, false));
    service.markNotificationRead(1).subscribe(value => response = value);
    const update = requests.expectOne(`${root}/1/read`);
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toBeNull();
    update.flush(notification(1, true));

    expect(response?.isRead).toBe(true);
    expect(service.unreadOnLatestPage()).toBe(0);
  });

  it('marks all read and deletes notifications', () => {
    service.listNotifications().subscribe();
    requests.expectOne(`${root}?page=0&size=20&sort=createdAt,desc`)
      .flush(page([notification(1, false), notification(2, false)]));

    service.markAllNotificationsRead().subscribe();
    const all = requests.expectOne(`${root}/read-all`);
    expect(all.request.method).toBe('PATCH');
    expect(all.request.body).toBeNull();
    all.flush(null, { status: 204, statusText: 'No Content' });
    expect(service.unreadOnLatestPage()).toBe(0);

    service.deleteNotification(1).subscribe();
    const deletion = requests.expectOne(`${root}/1`);
    expect(deletion.request.method).toBe('DELETE');
    deletion.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('decrements the latest-page unread count when an unread item is deleted', () => {
    service.listNotifications().subscribe();
    requests.expectOne(`${root}?page=0&size=20&sort=createdAt,desc`)
      .flush(page([notification(1, false), notification(2, false)]));
    service.deleteNotification(1).subscribe();
    requests.expectOne(`${root}/1`).flush(null, { status: 204, statusText: 'No Content' });
    expect(service.unreadOnLatestPage()).toBe(1);
  });

  it('rejects invalid IDs without making a request', () => {
    let error: unknown;
    service.getNotification(0).subscribe({ error: received => error = received });
    expect(error).toBeInstanceOf(RangeError);
    requests.expectNone(() => true);
  });

  it.each([400, 401, 403, 404, 409, 500])('propagates normalized HTTP %s errors', status => {
    let error: unknown;
    service.markNotificationRead(1).subscribe({ error: received => error = received });
    requests.expectOne(`${root}/1/read`).flush(
      { type: 'about:blank', title: 'Request failed', status, detail: 'Notification request failed' },
      { status, statusText: 'Request failed' },
    );
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(status);
  });
});

function notification(id: number, isRead: boolean): NotificationResponse {
  return {
    id,
    userId: 7,
    title: `Update ${id}`,
    message: 'A new placement update is available.',
    notificationType: NotificationType.ApplicationUpdate,
    isRead,
    createdAt: '2026-11-15T10:00:00Z',
  };
}

function page(
  content: NotificationResponse[],
  totalElements = content.length,
  pageNumber = 0,
  size = 20,
): PageResponse<NotificationResponse> {
  const totalPages = Math.ceil(totalElements / size);
  return {
    content,
    page: pageNumber,
    size,
    totalElements,
    totalPages,
    first: pageNumber === 0,
    last: pageNumber >= totalPages - 1,
    hasNext: pageNumber < totalPages - 1,
    hasPrevious: pageNumber > 0,
  };
}
