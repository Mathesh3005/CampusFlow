import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { InterviewQuery, InterviewResponse, PageResponse } from '../../../core/models/domain.models';

export const STUDENT_INTERVIEWS_PAGE_SIZE = 20;
export const STUDENT_INTERVIEWS_DEFAULT_SORT = 'scheduledAt,asc';

@Injectable({ providedIn: 'root' })
export class StudentInterviewsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  listInterviews(query: InterviewQuery = {}): Observable<PageResponse<InterviewResponse>> {
    const params = new HttpParams()
      .set('page', String(query.page ?? 0))
      .set('size', String(query.size ?? STUDENT_INTERVIEWS_PAGE_SIZE))
      .set('sort', query.sort ?? STUDENT_INTERVIEWS_DEFAULT_SORT);
    return this.http.get<PageResponse<InterviewResponse>>(`${this.baseUrl}/student/interviews`, { params });
  }

  getInterviewById(id: number): Observable<InterviewResponse> {
    return this.http.get<InterviewResponse>(`${this.baseUrl}/student/interviews/${id}`);
  }
}
