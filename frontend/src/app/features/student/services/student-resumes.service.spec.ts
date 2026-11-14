import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { apiInterceptor } from '../../../core/http/api.interceptor';
import { ApiError } from '../../../core/http/api-error.handler';
import { ResumeResponse } from '../../../core/models/domain.models';
import { StudentResumesService } from './student-resumes.service';

describe('StudentResumesService', () => {
  let service: StudentResumesService;
  let requests: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([apiInterceptor])), provideHttpClientTesting()],
    });
    service = TestBed.inject(StudentResumesService);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => requests.verify());

  it('loads resumes and normalizes backend active values, including multiple active resumes', () => {
    let result: { id: number; isActive: boolean }[] | undefined;
    service.listResumes().subscribe(resumes => result = resumes.map(({ id, isActive }) => ({ id, isActive })));
    const request = requests.expectOne(`${environment.apiBaseUrl}/student/resumes`);
    expect(request.request.method).toBe('GET');
    request.flush([
      resume(1, true),
      resume(2, true),
      resume(3, false),
    ] satisfies ResumeResponse[]);

    expect(result).toEqual([
      { id: 1, isActive: true },
      { id: 2, isActive: true },
      { id: 3, isActive: false },
    ]);
  });

  it('uploads the file using the exact multipart field without setting Content-Type', () => {
    const file = new File(['%PDF-1.7'], 'portfolio.pdf', { type: 'application/pdf' });
    let result: ReturnType<typeof normalizedResume> | undefined;
    service.uploadResume(file).subscribe(resume => result = normalizedResume(resume));
    const request = requests.expectOne(`${environment.apiBaseUrl}/student/resumes`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeInstanceOf(FormData);
    const uploadedFile = (request.request.body as FormData).get('file') as File;
    expect(uploadedFile.name).toBe(file.name);
    expect(uploadedFile.type).toBe(file.type);
    expect(uploadedFile.size).toBe(file.size);
    expect(request.request.headers.has('Content-Type')).toBe(false);
    request.flush(resumeResponse(4, true));
    expect(result).toEqual({ id: 4, isActive: true });
  });

  it('activates a resume and maps the returned active value', () => {
    let result: ReturnType<typeof normalizedResume> | undefined;
    service.activateResume(4).subscribe(resume => result = normalizedResume(resume));
    const request = requests.expectOne(`${environment.apiBaseUrl}/student/resumes/4/activate`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toBeNull();
    request.flush(resumeResponse(4, true));
    expect(result).toEqual({ id: 4, isActive: true });
  });

  it('deactivates a resume and maps the returned active value', () => {
    let result: ReturnType<typeof normalizedResume> | undefined;
    service.deactivateResume(4).subscribe(resume => result = normalizedResume(resume));
    const request = requests.expectOne(`${environment.apiBaseUrl}/student/resumes/4/deactivate`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toBeNull();
    request.flush(resumeResponse(4, false));
    expect(result).toEqual({ id: 4, isActive: false });
  });

  it('deletes a resume using the student-scoped endpoint', () => {
    let completed = false;
    service.deleteResume(4).subscribe(() => completed = true);
    const request = requests.expectOne(`${environment.apiBaseUrl}/student/resumes/4`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(completed).toBe(true);
  });

  it('propagates normalized API errors from resume operations', () => {
    let receivedError: unknown;
    service.deleteResume(4).subscribe({ error: error => receivedError = error });
    requests.expectOne(`${environment.apiBaseUrl}/student/resumes/4`).flush(
      { type: 'about:blank', title: 'Conflict', status: 409, detail: 'Resume is in use' },
      { status: 409, statusText: 'Conflict' },
    );
    expect(receivedError).toBeInstanceOf(ApiError);
    expect((receivedError as ApiError).status).toBe(409);
  });
});

function normalizedResume(resume: { id: number; isActive: boolean }) {
  return { id: resume.id, isActive: resume.isActive };
}

function resume(id: number, active: boolean): ResumeResponse {
  return resumeResponse(id, active);
}

function resumeResponse(id: number, active: boolean): ResumeResponse {
  return {
    id, studentId: 9, fileName: `resume-${id}.pdf`, fileSize: 1024, contentType: 'application/pdf',
    active, uploadedAt: '2026-11-14T10:00:00Z',
  };
}
