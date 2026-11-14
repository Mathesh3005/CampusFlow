import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, catchError, map, of, switchMap } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { ApplicationResponse, PageResponse } from '../../../../core/models/domain.models';
import {
  OFFICER_APPLICATIONS_DEFAULT_SORT,
  OFFICER_APPLICATIONS_PAGE_SIZE,
  OfficerApplicationsQuery,
  OfficerApplicationsService,
} from '../../services/officer-applications.service';

type ApplicationsListState =
  | { status: 'loading' }
  | { status: 'ready'; page: PageResponse<ApplicationResponse> }
  | { status: 'error'; message: string };

@Component({
  selector: 'app-officer-applications-list',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './applications-list.component.html',
  styleUrl: './applications-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfficerApplicationsList implements OnInit {
  private readonly service = inject(OfficerApplicationsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pageRequests = new Subject<OfficerApplicationsQuery>();

  readonly pageIndex = signal(0);
  readonly state = signal<ApplicationsListState>({ status: 'loading' });

  ngOnInit(): void {
    this.pageRequests.pipe(
      switchMap(query => {
        this.state.set({ status: 'loading' });
        return this.service.listApplications(query).pipe(
          map(page => ({ status: 'ready' as const, page })),
          catchError((error: unknown) => of({
            status: 'error' as const,
            message: this.errorMessage(error),
          })),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(result => {
      if (result.status === 'ready' && result.page.totalPages > 0 && result.page.page >= result.page.totalPages) {
        this.pageIndex.set(result.page.totalPages - 1);
        this.load();
        return;
      }

      this.state.set(result);
    });

    this.load();
  }

  load(): void {
    this.pageRequests.next({
      page: this.pageIndex(),
      size: OFFICER_APPLICATIONS_PAGE_SIZE,
      sort: OFFICER_APPLICATIONS_DEFAULT_SORT,
    });
  }

  changePage(page: number): void {
    const current = this.state();
    if (current.status !== 'ready'
      || !Number.isInteger(page)
      || page < 0
      || page >= current.page.totalPages
      || page === this.pageIndex()) {
      return;
    }

    this.pageIndex.set(page);
    this.load();
  }

  retry(): void {
    this.load();
  }

  isValidApplicationId(id: number): boolean {
    return Number.isSafeInteger(id) && id > 0;
  }

  private errorMessage(error: unknown): string {
    if (error instanceof ApiError && error.status === 401) {
      return 'Your session has expired. Sign in again to view applications.';
    }
    return 'Applications could not be loaded. Please try again.';
  }
}
