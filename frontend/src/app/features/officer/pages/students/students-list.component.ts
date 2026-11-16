import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { PageResponse } from '../../../../core/models/domain.models';
import { OfficerStudent } from '../../models/officer-student.models';
import { OfficerStudentsService } from '../../services/officer-students.service';

type StudentListState =
  | { status: 'loading' }
  | { status: 'ready'; page: PageResponse<OfficerStudent> }
  | { status: 'error'; message: string };

@Component({
  selector: 'app-officer-students-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './students-list.component.html',
  styleUrl: './students-list.component.scss',
})
export class OfficerStudentsList implements OnInit {
  private readonly service = inject(OfficerStudentsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searches = new Subject<string>();
  private readonly pageRequests = new Subject<number>();

  readonly state = signal<StudentListState>({ status: 'loading' });
  readonly search = signal('');
  readonly department = signal('');
  readonly graduationYear = signal<number | null>(null);
  readonly pageIndex = signal(0);

  ngOnInit(): void {
    this.searches.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(value => {
      this.search.set(value);
      this.pageIndex.set(0);
      this.load();
    });

    this.pageRequests.pipe(
      switchMap(page => {
        this.state.set({ status: 'loading' });
        return this.service.list({
          search: this.search(),
          department: this.department(),
          graduationYear: this.graduationYear(),
          page,
          size: 20,
          sort: 'fullName,asc',
        }).pipe(
          map(pageResult => ({ status: 'ready' as const, page: pageResult })),
          catchError((error: unknown) => of({ status: 'error' as const, message: this.messageFor(error) })),
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

  onSearch(value: string): void { this.searches.next(value); }

  onDepartment(value: string): void {
    this.department.set(value);
    this.pageIndex.set(0);
    this.load();
  }

  onGraduationYear(value: string): void {
    const year = Number(value);
    this.graduationYear.set(Number.isInteger(year) && year > 1900 ? year : null);
    this.pageIndex.set(0);
    this.load();
  }

  changePage(delta: number): void {
    const current = this.state();
    if (current.status !== 'ready') return;
    const next = this.pageIndex() + delta;
    if (next < 0 || next >= current.page.totalPages) return;
    this.pageIndex.set(next);
    this.load();
  }

  load(): void { this.pageRequests.next(this.pageIndex()); }

  private messageFor(error: unknown): string {
    return error instanceof ApiError ? error.message : 'Student records could not be loaded.';
  }
}
