import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { StudentProject, StudentProjectRequest } from '../models/student-project.model';

@Injectable({ providedIn: 'root' })
export class StudentProjectsService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/student/projects`;

  list(): Observable<StudentProject[]> { return this.http.get<StudentProject[]>(this.endpoint); }
  create(project: StudentProjectRequest): Observable<StudentProject> {
    return this.http.post<StudentProject>(this.endpoint, project);
  }
  update(id: number, project: StudentProjectRequest): Observable<StudentProject> {
    return this.http.put<StudentProject>(`${this.endpoint}/${id}`, project);
  }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.endpoint}/${id}`); }
}
