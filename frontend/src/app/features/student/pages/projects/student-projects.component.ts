import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '../../../../core/http/api-error.handler';
import { StudentProject, StudentProjectRequest } from '../../models/student-project.model';
import { StudentProjectsService } from '../../services/student-projects.service';

@Component({
  selector: 'app-student-projects',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './student-projects.component.html',
  styleUrl: './student-projects.component.scss',
})
export class StudentProjectsComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly projectsApi = inject(StudentProjectsService);
  readonly projects = signal<StudentProject[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly formOpen = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly deletingId = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', Validators.maxLength(10000)],
    githubUrl: ['', Validators.maxLength(500)],
    liveDemoUrl: ['', Validators.maxLength(500)],
    startDate: [''],
    endDate: [''],
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.projectsApi.list().subscribe({
      next: projects => { this.projects.set(projects); this.loading.set(false); },
      error: error => { this.errorMessage.set(this.message(error, 'Could not load your projects.')); this.loading.set(false); },
    });
  }

  startCreate(): void {
    this.editingId.set(null);
    this.form.reset({ title: '', description: '', githubUrl: '', liveDemoUrl: '', startDate: '', endDate: '' });
    this.formError.set(null);
    this.formOpen.set(true);
  }

  startEdit(project: StudentProject): void {
    this.editingId.set(project.id);
    this.form.reset({
      title: project.title,
      description: project.description ?? '',
      githubUrl: project.githubUrl ?? '',
      liveDemoUrl: project.liveDemoUrl ?? '',
      startDate: project.startDate ?? '',
      endDate: project.endDate ?? '',
    });
    this.formError.set(null);
    this.formOpen.set(true);
  }

  cancelEdit(): void { this.formOpen.set(false); this.formError.set(null); }

  save(): void {
    if (this.form.invalid || this.saving()) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    if (value.startDate && value.endDate && value.endDate < value.startDate) {
      this.formError.set('The end date must be on or after the start date.');
      return;
    }
    const request: StudentProjectRequest = {
      title: value.title.trim(),
      description: value.description.trim() || null,
      githubUrl: value.githubUrl.trim() || null,
      liveDemoUrl: value.liveDemoUrl.trim() || null,
      startDate: value.startDate || null,
      endDate: value.endDate || null,
    };
    const id = this.editingId();
    this.saving.set(true);
    this.formError.set(null);
    const saveRequest = id === null ? this.projectsApi.create(request) : this.projectsApi.update(id, request);
    saveRequest.subscribe({
      next: project => {
        this.projects.update(items => id === null ? [project, ...items] : items.map(item => item.id === id ? project : item));
        this.formOpen.set(false);
        this.saving.set(false);
        this.successMessage.set(id === null ? 'Project added.' : 'Project updated.');
      },
      error: error => { this.formError.set(this.message(error, 'Could not save the project.')); this.saving.set(false); },
    });
  }

  deleteProject(id: number): void {
    this.projectsApi.delete(id).subscribe({
      next: () => {
        this.projects.update(items => items.filter(project => project.id !== id));
        this.deletingId.set(null);
        this.successMessage.set('Project removed.');
      },
      error: error => { this.errorMessage.set(this.message(error, 'Could not remove the project.')); this.deletingId.set(null); },
    });
  }

  private message(error: unknown, fallback: string): string {
    return error instanceof ApiError && error.message ? error.message : fallback;
  }
}
