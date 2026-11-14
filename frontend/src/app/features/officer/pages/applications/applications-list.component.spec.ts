import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { ApplicationResponse, ApplicationStatus, PageResponse } from '../../../../core/models/domain.models';
import {
  OFFICER_APPLICATIONS_DEFAULT_SORT,
  OFFICER_APPLICATIONS_PAGE_SIZE,
  OfficerApplicationsQuery,
  OfficerApplicationsService,
} from '../../services/officer-applications.service';
import { OfficerApplicationsList } from './applications-list.component';

describe('OfficerApplicationsList', () => {
  it('shows loading and renders backend application fields without profile details', () => {
    const response = new Subject<PageResponse<ApplicationResponse>>();
    const listApplications = vi.fn(() => response.asObservable());
    const fixture = createFixture(listApplications);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading applications');
    expect(listApplications).toHaveBeenCalledWith({
      page: 0,
      size: OFFICER_APPLICATIONS_PAGE_SIZE,
      sort: OFFICER_APPLICATIONS_DEFAULT_SORT,
    });

    response.next(page([application()], 0, 23, 2));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Application Management');
    expect(text).toContain('23');
    expect(text).toContain('Application ID');
    expect(text).toContain('Student ID');
    expect(text).toContain('Job ID');
    expect(text).toContain('UNDER REVIEW');
    expect(text).toContain('Applied');
    expect(text).not.toContain('Graduate Engineer');
    expect(text).not.toContain('CampusFlow Labs');
  });

  it('changes pages and ignores stale in-flight responses', () => {
    const firstResponse = new Subject<PageResponse<ApplicationResponse>>();
    const secondResponse = new Subject<PageResponse<ApplicationResponse>>();
    const listApplications = vi.fn((query: OfficerApplicationsQuery) => query.page === 0
      ? firstResponse.asObservable()
      : secondResponse.asObservable());
    const fixture = createFixture(listApplications);
    fixture.detectChanges();
    firstResponse.next(page([application()], 0, 21, 2));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button[aria-label="Next page"]').click();
    fixture.detectChanges();
    expect(listApplications).toHaveBeenLastCalledWith({
      page: 1,
      size: OFFICER_APPLICATIONS_PAGE_SIZE,
      sort: OFFICER_APPLICATIONS_DEFAULT_SORT,
    });
    expect(fixture.nativeElement.textContent).toContain('Loading applications');

    firstResponse.next(page([application(99)], 0, 21, 2));
    secondResponse.next(page([application(13)], 1, 21, 2));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('for application 13');
    expect(fixture.nativeElement.textContent).not.toContain('for application 99');
    expect(fixture.nativeElement.textContent).toContain('Page 2 of 2');
  });

  it('shows an empty state when no applications exist', () => {
    const fixture = createFixture(vi.fn(() => of(page([], 0, 0, 0))));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No applications to display');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });

  it('shows an API error and retries the current page', () => {
    const listApplications = vi.fn()
      .mockReturnValueOnce(throwError(() => new ApiError(500, 'server', { status: 500 })))
      .mockReturnValueOnce(of(page([application()], 0, 1, 1)));
    const fixture = createFixture(listApplications);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Applications could not be loaded');
    fixture.nativeElement.querySelector('button.primary-button').click();
    fixture.detectChanges();

    expect(listApplications).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('for application 42');
  });

  it('refreshes the current page', () => {
    const listApplications = vi.fn((query: OfficerApplicationsQuery) =>
      of(page([application()], query.page ?? 0, 21, 2)));
    const fixture = createFixture(listApplications);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button[aria-label="Next page"]').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.heading-actions button').click();

    expect(listApplications).toHaveBeenCalledTimes(3);
    expect(listApplications).toHaveBeenLastCalledWith({
      page: 1,
      size: OFFICER_APPLICATIONS_PAGE_SIZE,
      sort: OFFICER_APPLICATIONS_DEFAULT_SORT,
    });
  });

  it('links valid application IDs to their details route and omits invalid IDs', () => {
    const fixture = createFixture(vi.fn(() => of(page([
      application(42),
      application(0),
    ], 0, 2, 1))));
    fixture.detectChanges();

    const links = fixture.nativeElement.querySelectorAll('a.details-link');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('/officer/applications/42');
    expect(fixture.nativeElement.textContent).toContain('Details unavailable');
  });
});

function createFixture(listApplications: ReturnType<typeof vi.fn>) {
  TestBed.configureTestingModule({
    imports: [OfficerApplicationsList],
    providers: [
      provideRouter([]),
      {
        provide: OfficerApplicationsService,
        useValue: { listApplications },
      },
    ],
  });
  return TestBed.createComponent(OfficerApplicationsList);
}

function page<T>(content: T[], pageNumber: number, totalElements: number, totalPages: number): PageResponse<T> {
  return {
    content,
    page: pageNumber,
    size: OFFICER_APPLICATIONS_PAGE_SIZE,
    totalElements,
    totalPages,
    first: pageNumber === 0,
    last: pageNumber >= totalPages - 1,
    hasNext: pageNumber < totalPages - 1,
    hasPrevious: pageNumber > 0,
  };
}

function application(id = 42): ApplicationResponse {
  return {
    id,
    studentId: 7,
    jobId: 18,
    resumeId: null,
    companyName: 'CampusFlow Labs',
    jobTitle: 'Graduate Engineer',
    coverLetter: null,
    status: ApplicationStatus.UnderReview,
    appliedAt: '2026-11-14T10:00:00Z',
    updatedAt: '2026-11-14T10:00:00Z',
  };
}
