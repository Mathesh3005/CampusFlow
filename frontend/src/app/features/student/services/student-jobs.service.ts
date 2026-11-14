import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { EmploymentType, JobResponse, PageResponse, WorkMode } from '../../../core/models/domain.models';

export interface StudentJobFilters {
  location?: string;
  employmentType?: EmploymentType;
  workMode?: WorkMode;
}

export interface StudentJobQuery extends StudentJobFilters {
  page: number;
  size: number;
  sort?: string;
}

@Injectable({ providedIn: 'root' })
export class StudentJobsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  listJobs(query: StudentJobQuery): Observable<PageResponse<JobResponse>> {
    let params = new HttpParams()
      .set('page', String(query.page))
      .set('size', String(query.size))
      .set('sort', query.sort ?? 'createdAt,desc');
    if (query.location) params = params.set('location', query.location);
    if (query.employmentType) params = params.set('employmentType', query.employmentType);
    if (query.workMode) params = params.set('workMode', query.workMode);
    return this.http.get<PageResponse<JobResponse>>(`${this.baseUrl}/student/jobs`, { params });
  }

  getJob(id: number): Observable<JobResponse> {
    return this.http.get<JobResponse>(`${this.baseUrl}/student/jobs/${id}`);
  }
}
