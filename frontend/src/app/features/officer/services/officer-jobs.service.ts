import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { JobRequest, JobResponse, PageResponse } from '../../../core/models/domain.models';

export interface OfficerJobsQuery {
  page?: number;
  size?: number;
  sort?: string;
}

export const OFFICER_JOBS_PAGE_SIZE = 20;
export const OFFICER_JOBS_DEFAULT_SORT = 'createdAt,desc';

@Injectable({ providedIn: 'root' })
export class OfficerJobsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  listJobs(query: OfficerJobsQuery = {}): Observable<PageResponse<JobResponse>> {
    const params = new HttpParams()
      .set('page', String(query.page ?? 0))
      .set('size', String(query.size ?? OFFICER_JOBS_PAGE_SIZE))
      .set('sort', query.sort ?? OFFICER_JOBS_DEFAULT_SORT);

    return this.http.get<PageResponse<JobResponse>>(`${this.baseUrl}/officer/jobs`, { params });
  }

  getJobById(id: number): Observable<JobResponse> {
    return this.http.get<JobResponse>(`${this.baseUrl}/officer/jobs/${id}`);
  }

  createJob(request: JobRequest): Observable<JobResponse> {
    return this.http.post<JobResponse>(`${this.baseUrl}/officer/jobs`, request);
  }

  updateJob(id: number, request: JobRequest): Observable<JobResponse> {
    return this.http.put<JobResponse>(`${this.baseUrl}/officer/jobs/${id}`, request);
  }

  publishJob(id: number): Observable<JobResponse> {
    return this.http.patch<JobResponse>(`${this.baseUrl}/officer/jobs/${id}/publish`, null);
  }

  closeJob(id: number): Observable<JobResponse> {
    return this.http.patch<JobResponse>(`${this.baseUrl}/officer/jobs/${id}/close`, null);
  }

  deleteJob(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/officer/jobs/${id}`);
  }
}
