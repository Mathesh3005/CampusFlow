import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ProjectTechnology, StudentProject, StudentProjectRequest } from '../models/student-project.model';
import { SkillOption } from '../models/student-skill.model';

@Injectable({ providedIn: 'root' })
export class StudentProjectsService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/student/projects`;

  list(): Observable<StudentProject[]> { return this.http.get<StudentProject[]>(this.endpoint); }
  skillCatalog(): Observable<SkillOption[]> { return this.http.get<SkillOption[]>(`${environment.apiBaseUrl}/skills`); }
  technologies(projectId: number): Observable<ProjectTechnology[]> {
    return this.http.get<ProjectTechnology[]>(`${this.endpoint}/${projectId}/skills`);
  }
  addTechnology(projectId: number, skillId: number): Observable<ProjectTechnology> {
    return this.http.post<ProjectTechnology>(`${this.endpoint}/${projectId}/skills`, { skillId });
  }
  removeTechnology(projectId: number, skillId: number): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${projectId}/skills/${skillId}`);
  }
  create(project: StudentProjectRequest): Observable<StudentProject> {
    return this.http.post<StudentProject>(this.endpoint, project);
  }
  update(id: number, project: StudentProjectRequest): Observable<StudentProject> {
    return this.http.put<StudentProject>(`${this.endpoint}/${id}`, project);
  }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.endpoint}/${id}`); }
}
