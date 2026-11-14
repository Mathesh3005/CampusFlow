import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { JobResponse } from '../../../core/models/domain.models';

@Component({
  selector: 'app-available-jobs',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './available-jobs.component.html',
  styleUrl: './dashboard-panel.component.scss',
})
export class AvailableJobs {
  readonly jobs = input<JobResponse[]>([]);
  readonly error = input<string | null>(null);
  readonly loading = input(false);
}
