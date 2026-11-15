import { TestBed } from '@angular/core/testing';
import { RouterLink, provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { InterviewMode, InterviewResponse, InterviewStatus, PageResponse } from '../../../../core/models/domain.models';
import { StudentInterviewsService } from '../../services/student-interviews.service';
import { StudentInterviewsList } from './interviews-list.component';

describe('StudentInterviewsList', () => {
  it('loads the page and separates upcoming from completed or inactive interviews', () => {
    const listInterviews = vi.fn(() => of(page([
      interview(1, futureDate(), InterviewStatus.Scheduled),
      interview(2, '2020-01-01T10:00:00Z', InterviewStatus.Completed),
      interview(3, futureDate(), InterviewStatus.Cancelled),
    ], 0, 3)));
    const fixture = createFixture(listInterviews);
    fixture.detectChanges();

    expect(listInterviews).toHaveBeenCalledWith({ page: 0, size: 20, sort: 'scheduledAt,asc' });
    expect(fixture.nativeElement.textContent).toContain('Upcoming interviews');
    expect(fixture.nativeElement.textContent).toContain('Past interviews');
    expect(fixture.nativeElement.textContent).toContain('INTERVIEW #1');
    expect(fixture.nativeElement.textContent).toContain('INTERVIEW #2');
    expect(fixture.nativeElement.textContent).toContain('INTERVIEW #3');
    expect(fixture.nativeElement.querySelectorAll('button')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('a[href="/student/interviews/1"]')).not.toBeNull();
  });

  it('shows loading and empty states', () => {
    const response = new Subject<PageResponse<InterviewResponse>>();
    const fixture = createFixture(vi.fn(() => response.asObservable()));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading interviews');

    response.next(page([], 0, 0));
    response.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No interviews yet');
  });

  it('changes pages and requests a fresh page', () => {
    const listInterviews = vi.fn()
      .mockReturnValueOnce(of(page([interview(1, futureDate())], 0, 21)))
      .mockReturnValueOnce(of(page([interview(21, futureDate())], 1, 21)));
    const fixture = createFixture(listInterviews);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.pagination button:last-child') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(listInterviews).toHaveBeenCalledTimes(2);
    expect(listInterviews).toHaveBeenLastCalledWith({ page: 1, size: 20, sort: 'scheduledAt,asc' });
    expect(fixture.nativeElement.textContent).toContain('Page 2 of 2');
    expect(fixture.nativeElement.textContent).toContain('INTERVIEW #21');
  });

  it.each([
    [401, 'session has expired'],
    [403, 'permission to view'],
    [500, 'could not be loaded'],
  ])('handles interview listing HTTP %s and allows retry', (status, message) => {
    const listInterviews = vi.fn()
      .mockReturnValueOnce(throwError(() => new ApiError(status, 'other', { status })))
      .mockReturnValueOnce(of(page([interview(1, futureDate())], 0, 1)));
    const fixture = createFixture(listInterviews);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(message);
    (fixture.nativeElement.querySelector('.primary-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(listInterviews).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('INTERVIEW #1');
  });
});

function createFixture(listInterviews: (query: { page?: number; size?: number; sort?: string }) => Observable<PageResponse<InterviewResponse>>) {
  TestBed.configureTestingModule({
    imports: [StudentInterviewsList, RouterLink],
    providers: [
      provideRouter([]),
      { provide: StudentInterviewsService, useValue: { listInterviews } },
    ],
  });
  return TestBed.createComponent(StudentInterviewsList);
}

function interview(id: number, scheduledAt: string, status = InterviewStatus.Scheduled): InterviewResponse {
  return {
    id,
    applicationId: id + 100,
    scheduledAt,
    interviewMode: InterviewMode.Online,
    locationOrLink: 'https://meet.example.test/room',
    status,
    notes: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function page<T>(content: T[], pageNumber: number, totalElements: number): PageResponse<T> {
  const totalPages = Math.ceil(totalElements / 20);
  return {
    content,
    page: pageNumber,
    size: 20,
    totalElements,
    totalPages,
    first: pageNumber === 0,
    last: pageNumber >= totalPages - 1,
    hasNext: pageNumber < totalPages - 1,
    hasPrevious: pageNumber > 0,
  };
}

function futureDate(): string {
  return new Date(Date.now() + 86_400_000).toISOString();
}
