import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { JobResponse, PageResponse } from '../../../../core/models/domain.models';
import { StudentJobQuery, StudentJobsService } from '../../services/student-jobs.service';
import { StudentJobsList } from './jobs-list.component';

describe('StudentJobsList', () => {
  it('shows loading and empty states from the API response', () => {
    const response = new Subject<PageResponse<JobResponse>>();
    const listJobs = vi.fn(() => response.asObservable());
    TestBed.configureTestingModule({
      imports: [StudentJobsList],
      providers: [provideRouter([]), { provide: StudentJobsService, useValue: { listJobs } }],
    });
    const fixture = TestBed.createComponent(StudentJobsList);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading jobs');
    expect(listJobs).toHaveBeenCalledWith({ page: 0, size: 10, sort: 'createdAt,desc' });

    response.next(emptyPage());
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No matching jobs');
    expect(fixture.nativeElement.textContent).toContain('There are no published jobs matching these filters.');
  });

  it('shows the backend API error and retry control', () => {
    TestBed.configureTestingModule({
      imports: [StudentJobsList],
      providers: [
        provideRouter([]),
        { provide: StudentJobsService, useValue: { listJobs: () => throwError(() => new ApiError(500, 'server', { status: 500, detail: 'Jobs unavailable' })) } },
      ],
    });
    const fixture = TestBed.createComponent(StudentJobsList);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Jobs unavailable');
    expect(fixture.nativeElement.textContent).toContain('Try again');
  });

  it('resets to the first page when a supported filter changes', async () => {
    vi.useFakeTimers();
    try {
      const listJobs = vi.fn((query: StudentJobQuery) => of(pagedResult(query.page)));
      TestBed.configureTestingModule({
        imports: [StudentJobsList],
        providers: [provideRouter([]), { provide: StudentJobsService, useValue: { listJobs } }],
      });
      const fixture = TestBed.createComponent(StudentJobsList);
      fixture.detectChanges();
      fixture.componentInstance.changePage(2);
      fixture.detectChanges();
      expect(listJobs.mock.calls.at(-1)?.[0].page).toBe(2);

      fixture.componentInstance.filters.controls.location.setValue('Pune');
      await vi.advanceTimersByTimeAsync(300);
      fixture.detectChanges();

      expect(listJobs.mock.calls.at(-1)?.[0]).toEqual({ page: 0, size: 10, sort: 'createdAt,desc', location: 'Pune' });
    } finally {
      vi.useRealTimers();
    }
  });
});

function emptyPage(): PageResponse<JobResponse> {
  return { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true, hasNext: false, hasPrevious: false };
}

function pagedResult(pageNumber: number): PageResponse<JobResponse> {
  return { content: [], page: pageNumber, size: 10, totalElements: 30, totalPages: 3, first: pageNumber === 0, last: pageNumber === 2, hasNext: pageNumber < 2, hasPrevious: pageNumber > 0 };
}
