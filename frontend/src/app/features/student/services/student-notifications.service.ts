import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { NotificationsApiClient } from '../../notifications/services/notification-api';

@Injectable()
export class StudentNotificationsService extends NotificationsApiClient {
  constructor(http: HttpClient) {
    super(http, `${environment.apiBaseUrl}/student/notifications`);
  }
}
