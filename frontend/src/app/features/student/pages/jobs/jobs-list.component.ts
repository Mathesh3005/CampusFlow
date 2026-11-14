import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { EmploymentType, JobResponse, PageResponse, WorkMode } from '../../../../core/models/domain.models';
import { StudentJobQuery, StudentJobsService } from '../../services/student-jobs.service';

type JobsListState =
  | { status: 'loading' }
  | { status: 'ready'; page: PageResponse<JobResponse> }
  | { status: 'error'; message: string };

@Component({
  selector: 'app-student-jobs-list',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './jobs-list.component.html',
  styleUrl: './jobs-list.component.scss',
})
export class StudentJobsList implements OnInit {
  private readonly service = inject(StudentJobsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<StudentJobQuery>();
  readonly pageSize = 10;
  readonly pageIndex = signal(0);
  readonly state = signal<JobsListState>({ status: 'loading' });
  readonly filters = new FormGroup({
    location: new FormControl('', { nonNullable: true }),
    employmentType: new FormControl<EmploymentType | ''>('', { nonNullable: true }),
    workMode: new FormControl<WorkMode | ''>('', { nonNullable: true }),
  });
  readonly employmentTypes: EmploymentType[] = [EmploymentType.FullTime, EmploymentType.Internship];
  readonly workModes: WorkMode[] = [WorkMode.Onsite, WorkMode.Remote, WorkMode.Hybrid];

  ngOnInit(): void {
    this.requests.pipe(
      switchMap(query => {
        this.state.set({ status: 'loading' });
        return this.service.listJobs(query).pipe(
          switchMap(page => of({ status: 'ready' as const, page })),
          catchError((error: unknown) => of({ status: 'error' as const, message: this.errorMessage(error) })),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(state => this.state.set(state));

    this.filters.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged((previous, current) => previous.location === current.location
        && previous.employmentType === current.employmentType
        && previous.workMode === current.workMode),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.pageIndex.set(0);
      this.load();
    });

    this.load();
  }

  load(): void {
    const values = this.filters.getRawValue();
    const location = values.location.trim();
    this.requests.next({
      page: this.pageIndex(),
      size: this.pageSize,
      sort: 'createdAt,desc',
      ...(location ? { location } : {}),
      ...(values.employmentType ? { employmentType: values.employmentType } : {}),
      ...(values.workMode ? { workMode: values.workMode } : {}),
    });
  }

  clearFilters(): void {
    this.filters.reset({ location: '', employmentType: '', workMode: '' }, { emitEvent: false });
    this.pageIndex.set(0);
    this.load();
  }

  changePage(page: number): void {
    const result = this.state();
    if (result.status !== 'ready' || page < 0 || page >= result.page.totalPages || page === this.pageIndex()) return;
    this.pageIndex.set(page);
    this.load();
  }

  retry(): void { this.load(); }

  private errorMessage(error: unknown): string {
    return error instanceof ApiError ? error.message : 'Jobs could not be loaded. Please try again.';
  }
}
