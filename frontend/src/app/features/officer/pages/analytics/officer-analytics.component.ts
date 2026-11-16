import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin, catchError, of } from 'rxjs';

import { OfficerAnalyticsService } from '../../services/officer-analytics.service';

import {
  AnalyticsOverview,
  DepartmentPlacement,
  PlacementTrend,
} from '../../models/analytics.models';

interface AnalyticsState {
  overview: AnalyticsOverview | null;
  departments: DepartmentPlacement[];
  trends: PlacementTrend[];
  topDepartments: DepartmentPlacement[];
}

@Component({
  selector: 'app-officer-analytics',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './officer-analytics.component.html',
  styleUrl: './officer-analytics.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfficerAnalyticsComponent implements OnInit {

  private readonly service = inject(OfficerAnalyticsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly state = signal<AnalyticsState>({
    overview: null,
    departments: [],
    trends: [],
    topDepartments: [],
  });

  readonly metrics = computed(() => {
    const overview = this.state().overview;

    if (!overview) return [];

    return [
      {
        label: 'Total Students',
        value: overview.totalStudents,
        icon: 'groups',
        description: 'Registered students campus-wide',
      },
      {
        label: 'Applicants',
        value: overview.totalApplicants,
        icon: 'how_to_reg',
        description: 'Distinct students who applied to your jobs',
      },
      {
        label: 'Total Applications',
        value: overview.totalApplications,
        icon: 'description',
        description: 'Applications received for your jobs',
      },
      {
        label: 'Selected Students',
        value: overview.selectedStudents,
        icon: 'verified',
        description: 'Distinct students selected for your jobs',
      },
      {
        label: 'Campus Placement Rate',
        value: `${overview.placementRate}%`,
        icon: 'trending_up',
        description: 'Selected students ÷ all registered students',
      },
      {
        label: 'Application Selection Rate',
        value: `${overview.applicationSelectionRate}%`,
        icon: 'percent',
        description: 'Selected applications ÷ applications received',
      },
      {
        label: 'Published Jobs',
        value: overview.publishedJobs,
        icon: 'work',
        description: 'Currently published jobs',
      },
      {
        label: 'Total Jobs',
        value: overview.totalJobs,
        icon: 'business_center',
        description: 'Jobs created by your account',
      },
    ];
  });

  readonly maxTrendApplications = computed(() =>
    Math.max(
      1,
      ...this.state().trends.map(item => item.totalApplications),
    ),
  );

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      overview: this.service.getOverview(),
      departments: this.service.getDepartmentPlacements(),
      trends: this.service.getPlacementTrends(),
      topDepartments: this.service.getTopDepartments(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          this.state.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(
            'Unable to load analytics. Please try again.',
          );
          this.loading.set(false);
        },
      });
  }

  applicantBarWidth(value: number): number {
    return (value / this.maxTrendApplications()) * 100;
  }

  trackDepartment(
    index: number,
    department: DepartmentPlacement,
  ): string {
    return department.department;
  }

  trackYear(index: number, trend: PlacementTrend): number {
    return trend.graduationYear;
  }
}
