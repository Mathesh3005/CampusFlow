import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../core/models/domain.models';
import {
  AdminDashboard,
  CreatePlacementOfficerRequest,
  PlacementOfficerAdmin,
  PlacementOfficerQuery,
} from '../models/admin.models';

@Injectable({ providedIn: 'root' })
export class AdminOfficersService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/admin/officers`;

  getDashboard(): Observable<AdminDashboard> {
    return this.http.get<AdminDashboard>(`${environment.apiBaseUrl}/admin/dashboard`);
  }

  list(query: PlacementOfficerQuery): Observable<PageResponse<PlacementOfficerAdmin>> {
    let params = new HttpParams()
      .set('page', query.page ?? 0)
      .set('size', query.size ?? 20)
      .set('sort', query.sort ?? 'fullName,asc');
    if (query.search?.trim()) params = params.set('search', query.search.trim());
    return this.http.get<PageResponse<PlacementOfficerAdmin>>(this.endpoint, { params });
  }

  create(request: CreatePlacementOfficerRequest): Observable<PlacementOfficerAdmin> {
    return this.http.post<PlacementOfficerAdmin>(this.endpoint, request);
  }

  setActive(id: number, active: boolean): Observable<PlacementOfficerAdmin> {
    return this.http.patch<PlacementOfficerAdmin>(`${this.endpoint}/${id}/${active ? 'activate' : 'deactivate'}`, {});
  }
}
