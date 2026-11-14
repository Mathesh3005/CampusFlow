import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { StudentResume } from '../../models/student-resume.model';
import { StudentResumesService } from '../../services/student-resumes.service';
import { ResumeDeleteConfirmationDialog } from './resume-delete-confirmation-dialog.component';
import { StudentResumesPage } from './resumes-page.component';

interface ResumePageTestServices {
  listResumes?: () => Observable<StudentResume[]>;
  uploadResume?: (file: File) => Observable<StudentResume>;
  activateResume?: (id: number) => Observable<StudentResume>;
  deactivateResume?: (id: number) => Observable<StudentResume>;
  deleteResume?: (id: number) => Observable<void>;
  confirmDelete?: boolean;
}

describe('StudentResumesPage', () => {
  it('shows initial loading and then the empty state', () => {
    const response = new Subject<StudentResume[]>();
    const fixture = createFixture({ listResumes: () => response.asObservable() });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading your resumes');
    response.next([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No resumes uploaded');
  });

  it('renders metadata and allows multiple active resumes', () => {
    const fixture = createFixture({
      listResumes: () => of([resume(1, true), resume(2, true), resume(3, false)]),
    });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('resume-1.pdf');
    expect(text).toContain('1.0 KB');
    expect(text).toContain('Nov 14, 2026');
    expect(fixture.nativeElement.querySelectorAll('.status-chip:not(.inactive-chip)')).toHaveLength(2);
    expect(fixture.nativeElement.querySelectorAll('.inactive-chip')).toHaveLength(1);
  });

  it('rejects a non-PDF MIME type before upload', () => {
    const uploadResume = vi.fn(() => of(resume(5, true)));
    const fixture = createFixture({ uploadResume });
    fixture.detectChanges();
    selectFile(fixture, new File(['text'], 'resume.txt', { type: 'text/plain' }));

    expect(fixture.nativeElement.textContent).toContain('Choose a PDF file');
    expect(uploadResume).not.toHaveBeenCalled();
    expect((fixture.nativeElement.querySelector('#resume-file') as HTMLInputElement).value).toBe('');
  });

  it('rejects a file larger than 5 MiB before upload', () => {
    const uploadResume = vi.fn(() => of(resume(5, true)));
    const fixture = createFixture({ uploadResume });
    fixture.detectChanges();
    selectFile(fixture, new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.pdf', { type: 'application/pdf' }));

    expect(fixture.nativeElement.textContent).toContain('exceeds the 5 MiB limit');
    expect(uploadResume).not.toHaveBeenCalled();
  });

  it('accepts and uploads a PDF exactly 5 MiB in size', () => {
    const uploadResume = vi.fn((file: File) => of(resume(5, true, file.name)));
    const fixture = createFixture({ uploadResume });
    fixture.detectChanges();
    const file = new File([new Uint8Array(5 * 1024 * 1024)], 'maximum-size.pdf', { type: 'application/pdf' });
    selectFile(fixture, file);

    expect(fixture.componentInstance.selectedFile()?.size).toBe(5 * 1024 * 1024);
    expect(fixture.componentInstance.fileError()).toBeNull();
    (fixture.nativeElement.querySelector('.upload-submit') as HTMLButtonElement).click();

    expect(uploadResume).toHaveBeenCalledOnce();
    expect(uploadResume.mock.calls[0][0].size).toBe(5 * 1024 * 1024);
  });

  it('uploads a PDF, refreshes the list, and resets the file input after success', () => {
    let listCalls = 0;
    const listResumes = vi.fn(() => of(listCalls++ === 0 ? [] : [resume(5, true, 'portfolio.pdf')]));
    const uploadResume = vi.fn((file: File) => of(resume(5, true, file.name)));
    const fixture = createFixture({ listResumes, uploadResume });
    fixture.detectChanges();
    const input = selectFile(fixture, new File(['%PDF-1.7'], 'portfolio.pdf', { type: 'application/pdf' }));
    fixture.nativeElement.querySelector('.upload-submit').click();
    fixture.detectChanges();

    expect(uploadResume).toHaveBeenCalledOnce();
    expect(uploadResume.mock.calls[0][0].name).toBe('portfolio.pdf');
    expect(listResumes).toHaveBeenCalledTimes(2);
    expect(input.value).toBe('');
    expect(fixture.nativeElement.textContent).toContain('portfolio.pdf was uploaded successfully');
    expect(fixture.nativeElement.textContent).toContain('portfolio.pdf');
  });

  it('shows uploading state and disables duplicate upload submissions', () => {
    const pending = new Subject<StudentResume>();
    const uploadResume = vi.fn(() => pending.asObservable());
    const fixture = createFixture({ uploadResume });
    fixture.detectChanges();
    selectFile(fixture, new File(['%PDF-1.7'], 'portfolio.pdf', { type: 'application/pdf' }));

    const button = fixture.nativeElement.querySelector('.upload-submit') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    button.click();

    expect(uploadResume).toHaveBeenCalledOnce();
    expect(button.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Uploading and validating PDF');
  });

  it('activates and deactivates resumes without deactivating other active resumes', () => {
    const activateResume = vi.fn((id: number) => of(resume(id, true)));
    const deactivateResume = vi.fn((id: number) => of(resume(id, false)));
    const fixture = createFixture({
      listResumes: () => of([resume(1, false), resume(2, true)]),
      activateResume,
      deactivateResume,
    });
    fixture.detectChanges();

    const firstCard = fixture.nativeElement.querySelector('.resume-card') as HTMLElement;
    (firstCard.querySelector('.secondary-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(activateResume).toHaveBeenCalledWith(1);
    const activatedState = fixture.componentInstance.state();
    expect(activatedState.status).toBe('ready');
    if (activatedState.status === 'ready') expect(activatedState.resumes.filter(item => item.isActive)).toHaveLength(2);

    const updatedFirstCard = fixture.nativeElement.querySelector('.resume-card') as HTMLElement;
    (updatedFirstCard.querySelector('.secondary-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(deactivateResume).toHaveBeenCalledWith(1);
    const deactivatedState = fixture.componentInstance.state();
    expect(deactivatedState.status).toBe('ready');
    if (deactivatedState.status === 'ready') {
      expect(deactivatedState.resumes.find(item => item.id === 1)?.isActive).toBe(false);
      expect(deactivatedState.resumes.find(item => item.id === 2)?.isActive).toBe(true);
    }
  });

  it('requires confirmation before deletion and deletes only after confirmation', () => {
    const deleteResume = vi.fn(() => of(undefined));
    const fixture = createFixture({
      listResumes: () => of([resume(1, true)]),
      deleteResume,
      confirmDelete: false,
    });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.delete-button') as HTMLButtonElement).click();

    expect(fixture.dialog.open).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ data: { fileName: 'resume-1.pdf' }, role: 'alertdialog' }),
    );
    expect(deleteResume).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('resume-1.pdf');
  });

  it('removes a resume and shows success only after successful deletion', () => {
    const fixture = createFixture({
      listResumes: () => of([resume(1, true)]),
      deleteResume: () => of(undefined),
      confirmDelete: true,
    });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.delete-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('resume-1.pdf was deleted');
    expect(fixture.nativeElement.querySelector('.resume-card')).toBeNull();
  });

  it('keeps a resume visible and explains the application link on delete conflict', () => {
    const fixture = createFixture({
      listResumes: () => of([resume(1, true)]),
      deleteResume: () => throwError(() => new ApiError(409, 'conflict', { status: 409 })),
      confirmDelete: true,
    });
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.delete-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('resume-1.pdf');
    expect(text).toContain('linked to an application');
    expect(text).toContain('Withdrawn applications');
  });

  it('shows a retryable network error when the resume list cannot be loaded', () => {
    const listResumes = vi.fn(() => throwError(() => new ApiError(0, 'other', null)));
    const fixture = createFixture({ listResumes });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Unable to connect');
    (fixture.nativeElement.querySelector('.state-message button') as HTMLButtonElement).click();
    expect(listResumes).toHaveBeenCalledTimes(2);
  });

  it.each([
    [400, 'The file is empty or is not a valid PDF'],
    [401, 'Your session has expired'],
    [403, 'You do not have permission'],
    [413, 'exceeds the 5 MiB limit'],
    [500, 'server could not store your resume'],
    [0, 'Unable to connect'],
  ])('shows a safe upload message for HTTP %s', (status, message) => {
    const fixture = createFixture({
      uploadResume: () => throwError(() => new ApiError(status, 'other', null)),
    });
    fixture.detectChanges();
    selectFile(fixture, new File(['%PDF-1.7'], 'portfolio.pdf', { type: 'application/pdf' }));
    (fixture.nativeElement.querySelector('.upload-submit') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(message);
    if (status === 401) expect(fixture.nativeElement.querySelector('a[href="/login"]')).toBeTruthy();
  });
});

describe('ResumeDeleteConfirmationDialog', () => {
  it('communicates permanent deletion and returns the user decision', () => {
    const dialogRef = { close: vi.fn() };
    TestBed.configureTestingModule({
      imports: [ResumeDeleteConfirmationDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { fileName: 'resume-1.pdf' } },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    });
    const fixture = TestBed.createComponent(ResumeDeleteConfirmationDialog);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('permanently deleted');
    expect(fixture.nativeElement.textContent).toContain('including a withdrawn application');
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    buttons[0].click();
    expect(dialogRef.close).toHaveBeenLastCalledWith(false);
    buttons[1].click();
    expect(dialogRef.close).toHaveBeenLastCalledWith(true);
  });
});

function createFixture(services: ResumePageTestServices = {}) {
  const dialog = {
    open: vi.fn(() => ({ afterClosed: () => of(services.confirmDelete ?? false) })),
  };
  TestBed.configureTestingModule({
    imports: [StudentResumesPage],
    providers: [
      provideRouter([]),
      {
        provide: StudentResumesService,
        useValue: {
          listResumes: services.listResumes ?? (() => of([])),
          uploadResume: services.uploadResume ?? (() => of(resume(1, true))),
          activateResume: services.activateResume ?? ((id: number) => of(resume(id, true))),
          deactivateResume: services.deactivateResume ?? ((id: number) => of(resume(id, false))),
          deleteResume: services.deleteResume ?? (() => of(undefined)),
        },
      },
    ],
  });
  TestBed.overrideProvider(MatDialog, { useValue: dialog });
  return Object.assign(TestBed.createComponent(StudentResumesPage), { dialog });
}

function selectFile(fixture: ComponentFixture<StudentResumesPage>, file: File): HTMLInputElement {
  const input = fixture.nativeElement.querySelector('#resume-file') as HTMLInputElement;
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  let value = `C:\\fakepath\\${file.name}`;
  Object.defineProperty(input, 'value', {
    configurable: true,
    get: () => value,
    set: (next: string) => value = next,
  });
  input.dispatchEvent(new Event('change', { bubbles: true }));
  fixture.detectChanges();
  return input;
}

function resume(id: number, isActive: boolean, fileName = `resume-${id}.pdf`): StudentResume {
  return {
    id, studentId: 12, fileName, fileSize: 1024, contentType: 'application/pdf',
    isActive, uploadedAt: '2026-11-14T10:00:00Z',
  };
}
