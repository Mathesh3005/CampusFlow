import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, Subject, catchError, map, merge, of, switchMap } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { InterviewResponse } from '../../../../core/models/domain.models';
import { StudentInterviewsService } from '../../services/student-interviews.service';

type StudentInterviewDetailsState =
  | { status: 'loading' }
  | { status: 'ready'; interview: InterviewResponse }
  | { status: 'invalid' }
  | { status: 'unauthorized' }
  | { status: 'forbidden' }
  | { status: 'notFound' }
  | { status: 'error'; message: string };

@Component({
  selector: 'app-student-interview-details',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './interview-details.component.html',
  styleUrl: './interview-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentInterviewDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(StudentInterviewsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly retryRequests = new Subject<string | null>();

  readonly state = signal<StudentInterviewDetailsState>({ status: 'loading' });

  ngOnInit(): void {
    merge(
      this.route.paramMap.pipe(map(params => params.get('id'))),
      this.retryRequests,
    ).pipe(
      switchMap(id => this.loadInterview(id)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(result => this.state.set(result));
  }

  retry(): void {
    this.retryRequests.next(this.route.snapshot.paramMap.get('id'));
  }

  private loadInterview(idValue: string | null): Observable<StudentInterviewDetailsState> {
    if (idValue === null || !/^[0-9]+$/.test(idValue)) return of({ status: 'invalid' });
    const id = Number(idValue);
    if (!Number.isSafeInteger(id) || id <= 0) return of({ status: 'invalid' });

    this.state.set({ status: 'loading' });
    return this.service.getInterviewById(id).pipe(
      map(interview => ({ status: 'ready' as const, interview })),
      catchError((error: unknown) => of(this.errorState(error))),
    );
  }

  private errorState(error: unknown): StudentInterviewDetailsState {
    if (error instanceof ApiError) {
      if (error.status === 401) return { status: 'unauthorized' };
      if (error.status === 403) return { status: 'forbidden' };
      if (error.status === 404) return { status: 'notFound' };
    }
    return {
      status: 'error',
      message: error instanceof ApiError && error.status >= 500
        ? 'The server could not load this interview. Please try again.'
        : 'Interview details could not be loaded. Please try again.',
    };
  }
}
