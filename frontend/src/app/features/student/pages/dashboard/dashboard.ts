import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthStateStore } from '../../../../core/auth/auth-state.store';
import { ApplicationResponse, InterviewResponse, JobResponse, NotificationResponse } from '../../../../core/models/domain.models';
import { AvailableJobs } from '../../components/available-jobs.component';
import { OverviewStatCard } from '../../components/overview-stat-card.component';
import { RecentApplications } from '../../components/recent-applications.component';
import { RecentNotifications } from '../../components/recent-notifications.component';
import { UpcomingInterviews } from '../../components/upcoming-interviews.component';
import { DashboardLoadState } from '../../models/dashboard.models';
import { StudentDashboardService } from '../../services/student-dashboard.service';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [OverviewStatCard, RecentApplications, AvailableJobs, UpcomingInterviews, RecentNotifications],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class StudentDashboard implements OnInit {
  private readonly service = inject(StudentDashboardService);
  private readonly auth = inject(AuthStateStore);
  private readonly destroyRef = inject(DestroyRef);
  readonly user = this.auth.user;
  readonly state = signal<DashboardLoadState>({ status: 'loading', data: null, error: null });
  readonly loading = computed(() => this.state().status === 'loading');
  readonly data = computed(() => this.state().status === 'ready' ? this.state().data : null);
  readonly today = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date());

  ngOnInit(): void { this.load(); }

  load(): void {
    this.state.set({ status: 'loading', data: null, error: null });
    this.service.loadDashboard().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: data => this.state.set({ status: 'ready', data, error: null }),
      error: () => this.state.set({ status: 'error', data: null, error: 'The dashboard could not be loaded. Please try again.' }),
    });
  }

  applications(): ApplicationResponse[] { return this.data()?.applications.page?.content ?? []; }
  jobs(): JobResponse[] { return this.data()?.jobs.page?.content ?? []; }
  interviews(): InterviewResponse[] { return this.data()?.interviews.interviews ?? []; }
  notifications(): NotificationResponse[] { return this.data()?.notifications.page?.content ?? []; }
  applicationsCount(): number | null { return this.data()?.applications.page?.totalElements ?? null; }
  jobsCount(): number | null { return this.data()?.jobs.page?.totalElements ?? null; }
}
