import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApplicationRequest, ApplicationResponse, PageResponse } from '../../../core/models/domain.models';

@Injectable({ providedIn: 'root' })
export class StudentApplicationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  submitApplication(request: ApplicationRequest): Observable<ApplicationResponse> {
    return this.http.post<ApplicationResponse>(`${this.baseUrl}/student/applications`, request);
  }

  listApplications(page: number, size = 20): Observable<PageResponse<ApplicationResponse>> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size))
      .set('sort', 'appliedAt,desc');
    return this.http.get<PageResponse<ApplicationResponse>>(`${this.baseUrl}/student/applications`, { params });
  }

  getApplication(id: number): Observable<ApplicationResponse> {
    return this.http.get<ApplicationResponse>(`${this.baseUrl}/student/applications/${id}`);
  }

  withdrawApplication(id: number): Observable<ApplicationResponse> {
    return this.http.patch<ApplicationResponse>(`${this.baseUrl}/student/applications/${id}/withdraw`, null);
  }
}
