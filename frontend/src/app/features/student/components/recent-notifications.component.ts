import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NotificationResponse } from '../../../core/models/domain.models';

@Component({
  selector: 'app-recent-notifications',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './recent-notifications.component.html',
  styleUrl: './dashboard-panel.component.scss',
})
export class RecentNotifications {
  readonly notifications = input<NotificationResponse[]>([]);
  readonly error = input<string | null>(null);
  readonly loading = input(false);
}
