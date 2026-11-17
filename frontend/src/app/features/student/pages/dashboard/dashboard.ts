import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
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
  imports: [RouterLink, MatIconModule, OverviewStatCard, RecentApplications, AvailableJobs, UpcomingInterviews, RecentNotifications],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class StudentDashboard implements OnInit {
  private readonly service = inject(StudentDashboardService);
  private readonly auth = inject(AuthStateStore);
  private readonly destroyRef = inject(DestroyRef);
  readonly user = this.auth.user;
  readonly welcomeName = computed(() => this.data()?.summary?.studentName?.trim()
    || this.user()?.email?.split('@')[0]
    || 'there');
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
  applicationsCount(): number | null {
    return this.data()?.summary?.totalApplications ?? this.data()?.applications.page?.totalElements ?? null;
  }
  jobsCount(): number | null { return this.data()?.jobs.page?.totalElements ?? null; }
  applicationStat(key: string): number | null { return this.data()?.summary?.applicationStats?.[key] ?? null; }
  shortlistedCount(): number | null { return this.applicationStat('shortlisted'); }
  selectedCount(): number | null { return this.applicationStat('selected'); }
  upcomingInterviewCount(): number | null { return this.data()?.summary?.upcomingInterviews ?? null; }
  hasActiveResume(): boolean { return this.data()?.summary?.hasActiveResume ?? false; }
}
