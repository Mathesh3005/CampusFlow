import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApplicationResponse } from '../../../core/models/domain.models';

@Component({
  selector: 'app-recent-applications',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './recent-applications.component.html',
  styleUrl: './dashboard-panel.component.scss',
})
export class RecentApplications {
  readonly applications = input<ApplicationResponse[]>([]);
  readonly error = input<string | null>(null);
  readonly loading = input(false);
}
