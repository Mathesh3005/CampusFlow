import { Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { InterviewResponse, InterviewStatus } from '../../../core/models/domain.models';

@Component({
  selector: 'app-upcoming-interviews',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './upcoming-interviews.component.html',
  styleUrl: './dashboard-panel.component.scss',
})
export class UpcomingInterviews {
  readonly interviews = input<InterviewResponse[]>([]);
  readonly error = input<string | null>(null);
  readonly partialResults = input(false);
  readonly loading = input(false);
  readonly upcoming = computed(() => this.interviews()
    .filter(interview => interview.status === InterviewStatus.Scheduled && Date.parse(interview.scheduledAt) > Date.now())
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))
    .slice(0, 4));
}
