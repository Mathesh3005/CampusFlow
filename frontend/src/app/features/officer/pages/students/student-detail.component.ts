import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { OfficerStudentDetail } from '../../models/officer-student.models';
import { OfficerStudentsService } from '../../services/officer-students.service';

type DetailState =
  | { status: 'loading' }
  | { status: 'ready'; detail: OfficerStudentDetail }
  | { status: 'error'; message: string };

@Component({
  selector: 'app-officer-student-detail',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './student-detail.component.html',
  styleUrl: './student-detail.component.scss',
})
export class OfficerStudentDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(OfficerStudentsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state = signal<DetailState>({ status: 'loading' });

  ngOnInit(): void {
    this.route.paramMap.pipe(
      map(params => Number(params.get('id'))),
      switchMap(id => {
        if (!Number.isSafeInteger(id) || id <= 0) {
          return of({ status: 'error' as const, message: 'This student profile could not be found.' });
        }
        this.state.set({ status: 'loading' });
        return this.service.get(id).pipe(
          map(detail => ({ status: 'ready' as const, detail })),
          catchError((error: unknown) => of({ status: 'error' as const, message: this.messageFor(error) })),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(result => this.state.set(result));
  }

  statusLabel(status: string): string {
    return status.replaceAll('_', ' ').toLowerCase().replace(/^\w/, character => character.toUpperCase());
  }

  private messageFor(error: unknown): string {
    return error instanceof ApiError ? error.message : 'This student profile could not be loaded.';
  }
}
