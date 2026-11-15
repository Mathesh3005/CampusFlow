import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { InterviewMode, InterviewResponse, InterviewStatus, PageResponse } from '../../../../core/models/domain.models';
import { OfficerInterviewsService } from '../../services/officer-interviews.service';
import { OfficerInterviewsList } from './interviews-list.component';

describe('OfficerInterviewsList', () => {
  it('loads interview summaries and links to details', () => {
    const listInterviews = vi.fn(() => of(page([interview()], 0, 1)));
    const fixture = createFixture(listInterviews);
    fixture.detectChanges();

    expect(listInterviews).toHaveBeenCalledWith({ page: 0, size: 20, sort: 'scheduledAt,asc' });
    expect(fixture.nativeElement.textContent).toContain('Interview Management');
    expect(fixture.nativeElement.textContent).toContain('Application #37');
    expect(fixture.nativeElement.textContent).toContain('ONLINE');
    expect(fixture.nativeElement.textContent).toContain('SCHEDULED');
    expect(fixture.nativeElement.querySelector('a[href="/officer/interviews/81"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/officer/interviews/new"]')).not.toBeNull();
  });

  it('shows loading and empty states', () => {
    const fixture = createFixture(vi.fn(() => new Observable<PageResponse<InterviewResponse>>()));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading interviews');
    fixture.componentInstance.state.set({ status: 'ready', page: page([], 0, 0) });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No interviews to display');
  });

  it('requests the next page when pagination advances', () => {
    const listInterviews = vi.fn()
      .mockReturnValueOnce(of(page([interview(1)], 0, 21)))
      .mockReturnValueOnce(of(page([interview(21)], 1, 21)));
    const fixture = createFixture(listInterviews);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.pagination button:last-child') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(listInterviews).toHaveBeenCalledTimes(2);
    expect(listInterviews).toHaveBeenLastCalledWith({ page: 1, size: 20, sort: 'scheduledAt,asc' });
    expect(fixture.nativeElement.textContent).toContain('Page 2 of 2');
    expect(fixture.nativeElement.textContent).toContain('INTERVIEW #21');
  });

  it('reports an authorization error and can retry', () => {
    const listInterviews = vi.fn()
      .mockReturnValueOnce(throwError(() => new ApiError(403, 'forbidden', { status: 403 })))
      .mockReturnValueOnce(of(page([], 0, 0)));
    const fixture = createFixture(listInterviews);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('permission to view');
    (fixture.nativeElement.querySelector('.primary-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(listInterviews).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('No interviews to display');
  });
});

function createFixture(listInterviews: (query: { page?: number; size?: number; sort?: string }) => Observable<PageResponse<InterviewResponse>>) {
  TestBed.configureTestingModule({
    imports: [OfficerInterviewsList],
    providers: [
      provideRouter([]),
      { provide: OfficerInterviewsService, useValue: { listInterviews } },
    ],
  });
  return TestBed.createComponent(OfficerInterviewsList);
}

function interview(id = 81): InterviewResponse {
  return {
    id,
    applicationId: 37,
    scheduledAt: '2026-12-01T10:00:00Z',
    interviewMode: InterviewMode.Online,
    locationOrLink: 'https://meet.example.test/room',
    status: InterviewStatus.Scheduled,
    notes: null,
    createdAt: '2026-11-15T10:00:00Z',
    updatedAt: '2026-11-15T10:00:00Z',
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
