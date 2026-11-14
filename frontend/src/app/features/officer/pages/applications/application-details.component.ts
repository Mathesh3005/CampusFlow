import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, Subject, catchError, map, merge, of, switchMap } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { ApplicationResponse } from '../../../../core/models/domain.models';
import { OfficerApplicationsService } from '../../services/officer-applications.service';

type ApplicationDetailsState =
  | { status: 'loading' }
  | { status: 'ready'; application: ApplicationResponse }
  | { status: 'invalid' }
  | { status: 'unauthorized' }
  | { status: 'forbidden' }
  | { status: 'notFound' }
  | { status: 'error'; message: string };

@Component({
  selector: 'app-officer-application-details',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './application-details.component.html',
  styleUrl: './application-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfficerApplicationDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(OfficerApplicationsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly retryRequests = new Subject<string | null>();

  readonly state = signal<ApplicationDetailsState>({ status: 'loading' });

  ngOnInit(): void {
    merge(
      this.route.paramMap.pipe(map(params => params.get('id'))),
      this.retryRequests,
    ).pipe(
      switchMap(id => this.loadApplication(id)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(result => this.state.set(result));
  }

  retry(): void {
    this.retryRequests.next(this.route.snapshot.paramMap.get('id'));
  }

  private loadApplication(idValue: string | null): Observable<ApplicationDetailsState> {
    if (idValue === null || !/^[0-9]+$/.test(idValue)) {
      return of({ status: 'invalid' });
    }

    const id = Number(idValue);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return of({ status: 'invalid' });
    }

    this.state.set({ status: 'loading' });
    return this.service.getApplicationById(id).pipe(
      map(application => ({ status: 'ready' as const, application })),
      catchError((error: unknown) => of(this.errorState(error))),
    );
  }

  private errorState(error: unknown): ApplicationDetailsState {
    if (error instanceof ApiError) {
      if (error.status === 401) return { status: 'unauthorized' };
      if (error.status === 403) return { status: 'forbidden' };
      if (error.status === 404) return { status: 'notFound' };
    }

    return {
      status: 'error',
      message: error instanceof ApiError && error.status >= 500
        ? 'The server could not load this application. Please try again.'
        : 'Application details could not be loaded. Please try again.',
    };
  }
}
