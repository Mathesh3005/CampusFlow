import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ProficiencyLevel, SkillOption, StudentSkill } from '../models/student-skill.model';

@Injectable({ providedIn: 'root' })
export class StudentSkillsService {
  private readonly http = inject(HttpClient);
  private readonly studentEndpoint = `${environment.apiBaseUrl}/student/skills`;
  private readonly catalogEndpoint = `${environment.apiBaseUrl}/skills`;

  list(): Observable<StudentSkill[]> { return this.http.get<StudentSkill[]>(this.studentEndpoint); }
  catalog(): Observable<SkillOption[]> { return this.http.get<SkillOption[]>(this.catalogEndpoint); }
  add(skillId: number, proficiencyLevel: ProficiencyLevel): Observable<StudentSkill> {
    return this.http.post<StudentSkill>(this.studentEndpoint, { skillId, proficiencyLevel });
  }
  update(skillId: number, proficiencyLevel: ProficiencyLevel): Observable<StudentSkill> {
    return this.http.put<StudentSkill>(`${this.studentEndpoint}/${skillId}`, { skillId, proficiencyLevel });
  }
  remove(skillId: number): Observable<void> { return this.http.delete<void>(`${this.studentEndpoint}/${skillId}`); }
}
