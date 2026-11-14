import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ResumeResponse } from '../../../core/models/domain.models';
import { StudentResume } from '../models/student-resume.model';

@Injectable({ providedIn: 'root' })
export class StudentResumesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  listResumes(): Observable<StudentResume[]> {
    return this.http.get<ResumeResponse[]>(`${this.baseUrl}/student/resumes`).pipe(
      map(resumes => resumes.map(resume => this.toStudentResume(resume))),
    );
  }

  uploadResume(file: File): Observable<StudentResume> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<ResumeResponse>(`${this.baseUrl}/student/resumes`, formData).pipe(
      map(resume => this.toStudentResume(resume)),
    );
  }

  activateResume(id: number): Observable<StudentResume> {
    return this.http.patch<ResumeResponse>(`${this.baseUrl}/student/resumes/${id}/activate`, null).pipe(
      map(resume => this.toStudentResume(resume)),
    );
  }

  deactivateResume(id: number): Observable<StudentResume> {
    return this.http.patch<ResumeResponse>(`${this.baseUrl}/student/resumes/${id}/deactivate`, null).pipe(
      map(resume => this.toStudentResume(resume)),
    );
  }

  deleteResume(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/student/resumes/${id}`);
  }

  private toStudentResume({ active, ...resume }: ResumeResponse): StudentResume {
    return { ...resume, isActive: active };
  }
}
