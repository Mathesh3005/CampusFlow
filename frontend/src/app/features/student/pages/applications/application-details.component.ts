import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { ApplicationResponse } from '../../../../core/models/domain.models';
import { StudentApplicationsService } from '../../services/student-applications.service';

type ApplicationDetailsState =
  | { status: 'loading' }
  | { status: 'ready'; application: ApplicationResponse }
  | { status: 'invalid' }
  | { status: 'notFound' }
  | { status: 'unauthorized' }
  | { status: 'error' };

@Component({
  selector: 'app-student-application-details',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './application-details.component.html',
  styleUrl: './application-details.component.scss',
})
export class StudentApplicationDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly applications = inject(StudentApplicationsService);
  private readonly destroyRef = inject(DestroyRef);
  readonly state = signal<ApplicationDetailsState>({ status: 'loading' });

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        const idValue = params.get('id');
        if (idValue === null || !/^[0-9]+$/.test(idValue)) return of({ status: 'invalid' as const });
        const id = Number(idValue);
        if (!Number.isSafeInteger(id) || id <= 0) return of({ status: 'invalid' as const });
        this.state.set({ status: 'loading' });
        return this.applications.getApplication(id).pipe(
          map(application => ({ status: 'ready' as const, application })),
          catchError((error: unknown) => of(
            error instanceof ApiError && error.status === 401
              ? { status: 'unauthorized' as const }
              : error instanceof ApiError && error.status === 404
                ? { status: 'notFound' as const }
                : { status: 'error' as const },
          )),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(state => this.state.set(state));
  }
}
