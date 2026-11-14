import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApplicationResponse,
  ApplicationStatus,
  PageResponse,
} from '../../../core/models/domain.models';

export interface OfficerApplicationsQuery {
  page?: number;
  size?: number;
  sort?: string;
}

export type OfficerApplicationStatus =
  | ApplicationStatus.UnderReview
  | ApplicationStatus.Shortlisted
  | ApplicationStatus.Rejected
  | ApplicationStatus.Selected;

export const OFFICER_APPLICATIONS_PAGE_SIZE = 20;
export const OFFICER_APPLICATIONS_DEFAULT_SORT = 'appliedAt,desc';

@Injectable({ providedIn: 'root' })
export class OfficerApplicationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  listApplications(query: OfficerApplicationsQuery = {}): Observable<PageResponse<ApplicationResponse>> {
    const params = new HttpParams()
      .set('page', String(query.page ?? 0))
      .set('size', String(query.size ?? OFFICER_APPLICATIONS_PAGE_SIZE))
      .set('sort', query.sort ?? OFFICER_APPLICATIONS_DEFAULT_SORT);

    return this.http.get<PageResponse<ApplicationResponse>>(
      `${this.baseUrl}/officer/applications`,
      { params },
    );
  }

  getApplicationById(id: number): Observable<ApplicationResponse> {
    return this.http.get<ApplicationResponse>(`${this.baseUrl}/officer/applications/${id}`);
  }

  updateApplicationStatus(id: number, status: OfficerApplicationStatus): Observable<ApplicationResponse> {
    return this.http.patch<ApplicationResponse>(
      `${this.baseUrl}/officer/applications/${id}/status`,
      { status },
    );
  }
}
