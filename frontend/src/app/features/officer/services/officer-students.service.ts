import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../core/models/domain.models';
import { OfficerStudent, OfficerStudentDetail, OfficerStudentQuery } from '../models/officer-student.models';

@Injectable({ providedIn: 'root' })
export class OfficerStudentsService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/officer/students`;

  list(query: OfficerStudentQuery): Observable<PageResponse<OfficerStudent>> {
    let params = new HttpParams()
      .set('page', query.page ?? 0)
      .set('size', query.size ?? 20)
      .set('sort', query.sort ?? 'fullName,asc');
    if (query.search?.trim()) params = params.set('search', query.search.trim());
    if (query.department?.trim()) params = params.set('department', query.department.trim());
    if (query.graduationYear) params = params.set('graduationYear', query.graduationYear);
    return this.http.get<PageResponse<OfficerStudent>>(this.endpoint, { params });
  }

  get(id: number): Observable<OfficerStudentDetail> {
    return this.http.get<OfficerStudentDetail>(`${this.endpoint}/${id}`);
  }
}
