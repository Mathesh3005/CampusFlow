import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Subject, catchError, map, of, switchMap } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import {
  ApplicationResponse,
  InterviewResponse,
  NotificationResponse,
} from '../../../../core/models/domain.models';
import { notificationIcon, relativeNotificationTime } from '../../../notifications/notification-time';
import {
  OfficerApplicationsOverview,
  OfficerDashboardService,
  OfficerJobsOverview,
  OfficerUpcomingInterviews,
} from '../../services/officer-dashboard.service';

type SectionState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; message: string };

interface DashboardState {
  jobs: SectionState<OfficerJobsOverview>;
  applications: SectionState<OfficerApplicationsOverview>;
  interviews: SectionState<OfficerUpcomingInterviews>;
  notifications: SectionState<NotificationResponse[]>;
}

interface DashboardMetric {
  label: string;
  icon: string;
  caption: string;
  value: number | null;
  loading: boolean;
}

const initialState = (): DashboardState => ({
  jobs: { status: 'loading' },
  applications: { status: 'loading' },
  interviews: { status: 'loading' },
  notifications: { status: 'loading' },
});

@Component({
  selector: 'app-officer-dashboard',
  standalone: true,
  imports: [DatePipe, MatIconModule, RouterLink],
  templateUrl: './officer-dashboard.component.html',
  styleUrl: './officer-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfficerDashboard implements OnInit {
  private readonly service = inject(OfficerDashboardService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly jobsRequests = new Subject<void>();
  private readonly applicationsRequests = new Subject<void>();
  private readonly interviewsRequests = new Subject<void>();
  private readonly notificationsRequests = new Subject<void>();

  readonly state = signal<DashboardState>(initialState());
  readonly loading = computed(() => Object.values(this.state()).some(section => section.status === 'loading'));
  readonly allSectionsFailed = computed(() => Object.values(this.state()).every(section => section.status === 'error'));
  readonly metrics = computed<DashboardMetric[]>(() => {
    const current = this.state();
    const jobs = current.jobs.status === 'ready' ? current.jobs.data : null;
    const applications = current.applications.status === 'ready' ? current.applications.data : null;
    const interviews = current.interviews.status === 'ready' ? current.interviews.data : null;
    return [
      {
        label: 'Total jobs',
        icon: 'work_outline',
        caption: 'Across all jobs belonging to your account',
        value: jobs?.totalJobs ?? null,
        loading: current.jobs.status === 'loading',
      },
      {
        label: 'Published jobs',
        icon: 'campaign',
        caption: 'Open for student applications',
        value: jobs?.statusTotals.published ?? null,
        loading: current.jobs.status === 'loading',
      },
      {
        label: 'Draft jobs',
        icon: 'edit_note',
        caption: 'Not yet visible to students',
        value: jobs?.statusTotals.draft ?? null,
        loading: current.jobs.status === 'loading',
      },
      {
        label: 'Closed jobs',
        icon: 'work_off',
        caption: 'No longer accepting applications',
        value: jobs?.statusTotals.closed ?? null,
        loading: current.jobs.status === 'loading',
      },
      {
        label: 'Total applications',
        icon: 'description',
        caption: 'Across applications to your jobs',
        value: applications?.totalApplications ?? null,
        loading: current.applications.status === 'loading',
      },
      {
        label: 'Awaiting review',
        icon: 'pending_actions',
        caption: 'Applied or under review',
        value: applications?.statusTotals.awaitingReview ?? null,
        loading: current.applications.status === 'loading',
      },
      {
        label: 'Shortlisted',
        icon: 'task_alt',
        caption: 'Advanced past initial review',
        value: applications?.statusTotals.shortlisted ?? null,
        loading: current.applications.status === 'loading',
      },
      {
        label: 'Selected',
        icon: 'verified',
        caption: 'Applications marked as selected',
        value: applications?.statusTotals.selected ?? null,
        loading: current.applications.status === 'loading',
      },
      {
        label: 'Upcoming interviews',
        icon: 'event',
        caption: interviews?.upcomingTotal === 0
          ? 'No interviews exist for your jobs'
          : 'An upcoming interview aggregate is not exposed by the API',
        value: interviews?.upcomingTotal ?? null,
        loading: current.interviews.status === 'loading',
      },
    ];
  });

  ngOnInit(): void {
    this.jobsRequests.pipe(
      switchMap(() => this.service.loadJobsOverview().pipe(
        map(data => ({ status: 'ready' as const, data })),
        catchError((error: unknown) => of({ status: 'error' as const, message: this.errorMessage(error) })),
      )),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(section => this.state.update(current => ({ ...current, jobs: section })));

    this.applicationsRequests.pipe(
      switchMap(() => this.service.loadApplicationsOverview().pipe(
        map(data => ({ status: 'ready' as const, data })),
        catchError((error: unknown) => of({ status: 'error' as const, message: this.errorMessage(error) })),
      )),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(section => this.state.update(current => ({ ...current, applications: section })));

    this.interviewsRequests.pipe(
      switchMap(() => this.service.loadUpcomingInterviews().pipe(
        map(data => ({ status: 'ready' as const, data })),
        catchError((error: unknown) => of({ status: 'error' as const, message: this.errorMessage(error) })),
      )),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(section => this.state.update(current => ({ ...current, interviews: section })));

    this.notificationsRequests.pipe(
      switchMap(() => this.service.loadRecentNotifications().pipe(
        map(data => ({ status: 'ready' as const, data })),
        catchError((error: unknown) => of({ status: 'error' as const, message: this.errorMessage(error) })),
      )),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(section => this.state.update(current => ({ ...current, notifications: section })));

    this.load();
  }

  load(): void {
    this.state.set(initialState());
    this.jobsRequests.next();
    this.applicationsRequests.next();
    this.interviewsRequests.next();
    this.notificationsRequests.next();
  }

  retryJobs(): void {
    this.state.update(current => ({ ...current, jobs: { status: 'loading' } }));
    this.jobsRequests.next();
  }

  retryApplications(): void {
    this.state.update(current => ({ ...current, applications: { status: 'loading' } }));
    this.applicationsRequests.next();
  }

  retryInterviews(): void {
    this.state.update(current => ({ ...current, interviews: { status: 'loading' } }));
    this.interviewsRequests.next();
  }

  retryNotifications(): void {
    this.state.update(current => ({ ...current, notifications: { status: 'loading' } }));
    this.notificationsRequests.next();
  }

  applications(): ApplicationResponse[] {
    const section = this.state().applications;
    return section.status === 'ready' ? section.data.recentApplications : [];
  }

  interviews(): InterviewResponse[] {
    const section = this.state().interviews;
    return section.status === 'ready' ? section.data.interviews : [];
  }

  notifications(): NotificationResponse[] {
    const section = this.state().notifications;
    return section.status === 'ready' ? section.data : [];
  }

  notificationIcon(type: NotificationResponse['notificationType']): string {
    return notificationIcon(type);
  }

  notificationTime(createdAt: string): string {
    return relativeNotificationTime(createdAt);
  }

  isValidId(id: number): boolean {
    return Number.isSafeInteger(id) && id > 0;
  }

  private errorMessage(error: unknown): string {
    if (!(error instanceof ApiError)) return 'This dashboard section could not be loaded. Please try again.';
    switch (error.status) {
      case 400: return 'The dashboard request was invalid. Refresh and try again.';
      case 401: return 'Your session has expired. Sign in again to continue.';
      case 403: return 'You do not have permission to view this dashboard section.';
      case 404: return 'The requested dashboard data could not be found.';
      case 409: return 'The dashboard data may have changed. Refresh and try again.';
      default: return 'This dashboard section could not be loaded. Please try again.';
    }
  }
}
