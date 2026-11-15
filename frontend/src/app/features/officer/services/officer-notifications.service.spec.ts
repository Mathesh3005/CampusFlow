import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { ApiError } from '../../../core/http/api-error.handler';
import { apiInterceptor } from '../../../core/http/api.interceptor';
import { NotificationResponse, NotificationType, PageResponse } from '../../../core/models/domain.models';
import { OfficerNotificationsService } from './officer-notifications.service';

describe('OfficerNotificationsService', () => {
  let service: OfficerNotificationsService;
  let requests: HttpTestingController;
  const root = `${environment.apiBaseUrl}/officer/notifications`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OfficerNotificationsService,
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(OfficerNotificationsService);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => requests.verify());

  it('lists only placement-officer notifications using the backend paging contract', () => {
    let response: PageResponse<NotificationResponse> | undefined;
    service.listNotifications().subscribe(value => response = value);
    const request = requests.expectOne(`${root}?page=0&size=20&sort=createdAt,desc`);
    expect(request.request.method).toBe('GET');
    const result = page([notification(8, false)]);
    request.flush(result);
    expect(response).toEqual(result);
    expect(service.unreadOnLatestPage()).toBe(1);
  });

  it('gets details, marks one or all as read, and deletes through officer endpoints', () => {
    let details: NotificationResponse | undefined;
    service.getNotification(8).subscribe(value => details = value);
    const get = requests.expectOne(`${root}/8`);
    expect(get.request.method).toBe('GET');
    get.flush(notification(8, false));
    expect(details?.id).toBe(8);

    service.markNotificationRead(8).subscribe();
    const read = requests.expectOne(`${root}/8/read`);
    expect(read.request.method).toBe('PATCH');
    expect(read.request.body).toBeNull();
    read.flush(notification(8, true));

    service.markAllNotificationsRead().subscribe();
    const all = requests.expectOne(`${root}/read-all`);
    expect(all.request.method).toBe('PATCH');
    expect(all.request.body).toBeNull();
    all.flush(null, { status: 204, statusText: 'No Content' });

    service.deleteNotification(8).subscribe();
    const deletion = requests.expectOne(`${root}/8`);
    expect(deletion.request.method).toBe('DELETE');
    deletion.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('rejects invalid IDs without making a request', () => {
    let invalidError: unknown;
    service.deleteNotification(-1).subscribe({ error: received => invalidError = received });
    expect(invalidError).toBeInstanceOf(RangeError);
    requests.expectNone(() => true);
  });

  it.each([400, 401, 403, 404, 409, 500])('propagates normalized officer HTTP %s errors', status => {
    let apiError: unknown;
    service.getNotification(8).subscribe({ error: received => apiError = received });
    requests.expectOne(`${root}/8`).flush(
      { type: 'about:blank', title: 'Request failed', status, detail: 'Notification access denied' },
      { status, statusText: 'Request failed' },
    );
    expect(apiError).toBeInstanceOf(ApiError);
    expect((apiError as ApiError).status).toBe(status);
  });
});

function notification(id: number, isRead: boolean): NotificationResponse {
  return {
    id,
    userId: 12,
    title: `Officer update ${id}`,
    message: 'A new application update is available.',
    notificationType: NotificationType.ApplicationUpdate,
    isRead,
    createdAt: '2026-11-15T10:00:00Z',
  };
}

function page(content: NotificationResponse[]): PageResponse<NotificationResponse> {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: content.length > 0 ? 1 : 0,
    first: true,
    last: true,
    hasNext: false,
    hasPrevious: false,
  };
}
