import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { StudentProfile, StudentProfileUpdate } from '../models/student-profile.model';

@Injectable({ providedIn: 'root' })
export class StudentProfileService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/student/profile`;

  getProfile(): Observable<StudentProfile> {
    return this.http.get<StudentProfile>(this.endpoint);
  }

  updateProfile(update: StudentProfileUpdate): Observable<StudentProfile> {
    return this.http.put<StudentProfile>(this.endpoint, update);
  }
}
