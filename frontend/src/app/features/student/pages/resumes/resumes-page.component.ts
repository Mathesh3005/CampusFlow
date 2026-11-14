import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, catchError, filter, map, of, switchMap } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { StudentResume } from '../../models/student-resume.model';
import { StudentResumesService } from '../../services/student-resumes.service';
import { ResumeDeleteConfirmationDialog } from './resume-delete-confirmation-dialog.component';

const MAX_RESUME_SIZE = 5 * 1024 * 1024;
const PDF_CONTENT_TYPE = 'application/pdf';

type ResumeListState =
  | { status: 'loading' }
  | { status: 'ready'; resumes: StudentResume[] }
  | { status: 'error'; message: string; requiresLogin: boolean };

type ResumeOperation = { resumeId: number; action: 'activate' | 'deactivate' | 'delete' };

@Component({
  selector: 'app-student-resumes-page',
  standalone: true,
  imports: [DatePipe, MatDialogModule, RouterLink],
  templateUrl: './resumes-page.component.html',
  styleUrl: './resumes-page.component.scss',
})
export class StudentResumesPage implements OnInit {
  private readonly resumesService = inject(StudentResumesService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly refreshRequests = new Subject<void>();
  private selectedFileInput: HTMLInputElement | null = null;
  readonly state = signal<ResumeListState>({ status: 'loading' });
  readonly selectedFile = signal<File | null>(null);
  readonly fileError = signal<string | null>(null);
  readonly operationError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly uploading = signal(false);
  readonly operation = signal<ResumeOperation | null>(null);
  readonly needsLogin = signal(false);

  ngOnInit(): void {
    this.refreshRequests.pipe(
      switchMap(() => {
        this.state.set({ status: 'loading' });
        return this.resumesService.listResumes().pipe(
          map(resumes => ({ status: 'ready' as const, resumes })),
          catchError((error: unknown) => of({
            status: 'error' as const,
            message: this.errorMessage(error, 'list'),
            requiresLogin: this.isUnauthorized(error),
          })),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(state => {
      this.needsLogin.set(state.status === 'error' && state.requiresLogin);
      this.state.set(state);
    });
    this.loadResumes();
  }

  onFileSelected(event: Event): void {
    const input = event.currentTarget as HTMLInputElement | null;
    if (!input) return;
    this.selectedFileInput = input;
    this.selectedFile.set(null);
    this.fileError.set(null);
    this.successMessage.set(null);
    this.operationError.set(null);
    this.needsLogin.set(false);

    const file = input.files?.[0] ?? null;
    if (!file) return;
    if (file.size === 0) {
      this.fileError.set('The selected file is empty. Choose a PDF file.');
      input.value = '';
      return;
    }
    if (file.type !== PDF_CONTENT_TYPE) {
      this.fileError.set('Choose a PDF file with the application/pdf file type.');
      input.value = '';
      return;
    }
    if (file.size > MAX_RESUME_SIZE) {
      this.fileError.set('The selected file exceeds the 5 MiB limit.');
      input.value = '';
      return;
    }
    this.selectedFile.set(file);
  }

  clearSelectedFile(): void {
    this.selectedFile.set(null);
    this.fileError.set(null);
    if (this.selectedFileInput) this.selectedFileInput.value = '';
  }

  upload(): void {
    const file = this.selectedFile();
    if (!file || this.uploading() || this.operation() !== null) return;

    this.uploading.set(true);
    this.fileError.set(null);
    this.operationError.set(null);
    this.successMessage.set(null);
    this.needsLogin.set(false);
    this.resumesService.uploadResume(file).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: resume => {
        this.uploading.set(false);
        this.clearSelectedFile();
        this.successMessage.set(`${resume.fileName} was uploaded successfully.`);
        this.loadResumes();
      },
      error: (error: unknown) => {
        this.uploading.set(false);
        this.fileError.set(this.errorMessage(error, 'upload'));
        this.needsLogin.set(this.isUnauthorized(error));
      },
    });
  }

  activate(resume: StudentResume): void {
    this.runOperation(resume, 'activate');
  }

  deactivate(resume: StudentResume): void {
    this.runOperation(resume, 'deactivate');
  }

  confirmDelete(resume: StudentResume): void {
    if (this.uploading() || this.operation() !== null) return;
    this.dialog.open(ResumeDeleteConfirmationDialog, {
      data: { fileName: resume.fileName },
      role: 'alertdialog',
    }).afterClosed().pipe(
      filter(confirmed => confirmed === true),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.runOperation(resume, 'delete'));
  }

  retry(): void {
    this.needsLogin.set(false);
    this.loadResumes();
  }

  formatFileSize(size: number): string {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }

  private loadResumes(): void {
    this.refreshRequests.next();
  }

  private runOperation(resume: StudentResume, action: ResumeOperation['action']): void {
    if (this.uploading() || this.operation() !== null) return;
    this.operation.set({ resumeId: resume.id, action });
    this.operationError.set(null);
    this.successMessage.set(null);
    this.needsLogin.set(false);

    if (action === 'delete') {
      this.resumesService.deleteResume(resume.id).pipe(
        takeUntilDestroyed(this.destroyRef),
      ).subscribe({
        next: () => this.completeDelete(resume),
        error: error => this.failOperation(error, action),
      });
      return;
    }

    const request = action === 'activate'
      ? this.resumesService.activateResume(resume.id)
      : this.resumesService.deactivateResume(resume.id);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: updated => this.completeStatusChange(resume, updated, action),
      error: error => this.failOperation(error, action),
    });
  }

  private completeDelete(resume: StudentResume): void {
    this.operation.set(null);
    const current = this.state();
    if (current.status === 'ready') {
      this.state.set({ status: 'ready', resumes: current.resumes.filter(item => item.id !== resume.id) });
    }
    this.successMessage.set(`${resume.fileName} was deleted.`);
  }

  private completeStatusChange(resume: StudentResume, updated: StudentResume, action: 'activate' | 'deactivate'): void {
    this.operation.set(null);
    const current = this.state();
    if (current.status === 'ready') {
      this.state.set({
        status: 'ready',
        resumes: current.resumes.map(item => item.id === resume.id ? updated : item),
      });
    }
    this.successMessage.set(`${resume.fileName} was ${action === 'activate' ? 'activated' : 'deactivated'}.`);
  }

  private failOperation(error: unknown, action: ResumeOperation['action']): void {
    this.operation.set(null);
    this.operationError.set(this.errorMessage(error, action));
    this.needsLogin.set(this.isUnauthorized(error));
    if (error instanceof ApiError && error.status === 404) this.loadResumes();
  }

  private errorMessage(error: unknown, action: 'list' | 'upload' | 'activate' | 'deactivate' | 'delete'): string {
    if (error instanceof ApiError) {
      if (error.status === 0) return 'Unable to connect. Check your internet connection and try again.';
      if (error.status === 401) return 'Your session has expired. Sign in again.';
      if (error.status === 403) return 'You do not have permission to manage these resumes.';
      if (error.status === 404) return action === 'list'
        ? 'Your resumes are unavailable. Please try again.'
        : 'This resume is no longer available. The list has been refreshed.';
      if (error.status === 409 && action === 'delete') {
        return 'This resume is linked to an application and cannot be deleted. Withdrawn applications also retain their resume links.';
      }
      if (error.status === 409) return 'This resume could not be updated because its state has changed.';
      if (error.status === 413) return 'The selected file exceeds the 5 MiB limit.';
      if (error.status === 400 && action === 'upload') return 'The file is empty or is not a valid PDF. The server also verifies the PDF signature.';
      if (error.status === 400) return 'The resume request was invalid. Please try again.';
      if (error.status >= 500) return action === 'upload'
        ? 'The server could not store your resume. Please try again later.'
        : 'The server could not complete this resume request. Please try again later.';
    }
    if (action === 'list') return 'Your resumes could not be loaded. Please try again.';
    if (action === 'upload') return 'The resume could not be uploaded. Please try again.';
    return 'The resume action could not be completed. Please try again.';
  }

  private isUnauthorized(error: unknown): boolean {
    return error instanceof ApiError && error.status === 401;
  }
}
