import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

import {
  AnalyticsOverview,
  DepartmentPlacement,
  PlacementTrend,
} from '../models/analytics.models';

@Injectable({ providedIn: 'root' })
export class OfficerAnalyticsService {

  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/officer/analytics`;

  getOverview(): Observable<AnalyticsOverview> {
    return this.http.get<AnalyticsOverview>(
      `${this.baseUrl}/overview`
    );
  }

  getDepartmentPlacements(): Observable<DepartmentPlacement[]> {
    return this.http.get<DepartmentPlacement[]>(
      `${this.baseUrl}/placements`
    );
  }

  getPlacementTrends(): Observable<PlacementTrend[]> {
    return this.http.get<PlacementTrend[]>(
      `${this.baseUrl}/placement-trends`
    );
  }

  getTopDepartments(): Observable<DepartmentPlacement[]> {
    return this.http.get<DepartmentPlacement[]>(
      `${this.baseUrl}/top-departments`
    );
  }
}