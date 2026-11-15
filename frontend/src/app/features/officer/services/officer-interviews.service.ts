import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  InterviewQuery,
  InterviewRequest,
  InterviewResponse,
  InterviewStatus,
  InterviewUpdateRequest,
  PageResponse,
} from '../../../core/models/domain.models';

export const OFFICER_INTERVIEWS_PAGE_SIZE = 20;
export const OFFICER_INTERVIEWS_DEFAULT_SORT = 'scheduledAt,asc';
export type OfficerInterviewStatus = InterviewStatus.Completed | InterviewStatus.Cancelled;

@Injectable({ providedIn: 'root' })
export class OfficerInterviewsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  listInterviews(query: InterviewQuery = {}): Observable<PageResponse<InterviewResponse>> {
    const params = new HttpParams()
      .set('page', String(query.page ?? 0))
      .set('size', String(query.size ?? OFFICER_INTERVIEWS_PAGE_SIZE))
      .set('sort', query.sort ?? OFFICER_INTERVIEWS_DEFAULT_SORT);
    return this.http.get<PageResponse<InterviewResponse>>(`${this.baseUrl}/officer/interviews`, { params });
  }

  getInterviewById(id: number): Observable<InterviewResponse> {
    return this.http.get<InterviewResponse>(`${this.baseUrl}/officer/interviews/${id}`);
  }

  scheduleInterview(request: InterviewRequest): Observable<InterviewResponse> {
    return this.http.post<InterviewResponse>(`${this.baseUrl}/officer/interviews`, request);
  }

  updateInterview(id: number, request: InterviewUpdateRequest): Observable<InterviewResponse> {
    return this.http.put<InterviewResponse>(`${this.baseUrl}/officer/interviews/${id}`, request);
  }

  updateInterviewStatus(id: number, status: OfficerInterviewStatus): Observable<InterviewResponse> {
    return this.http.patch<InterviewResponse>(`${this.baseUrl}/officer/interviews/${id}/status`, { status });
  }

  deleteInterview(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/officer/interviews/${id}`);
  }
}
