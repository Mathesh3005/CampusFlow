import { Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '../../../../core/http/api-error.handler';
import { ProjectTechnology, StudentProject, StudentProjectRequest } from '../../models/student-project.model';
import { SkillOption } from '../../models/student-skill.model';
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
  readonly technologyProjectId = signal<number | null>(null);
  readonly technologies = signal<ProjectTechnology[]>([]);
  readonly technologyCatalog = signal<SkillOption[]>([]);
  readonly selectedTechnologyId = signal('');
  readonly technologyLoading = signal(false);
  readonly technologySaving = signal(false);
  readonly technologyError = signal<string | null>(null);
  readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', Validators.maxLength(10000)],
    githubUrl: ['', [Validators.maxLength(500), Validators.pattern(/^https?:\/\/\S+$/i)]],
    liveDemoUrl: ['', [Validators.maxLength(500), Validators.pattern(/^https?:\/\/\S+$/i)]],
    startDate: [''],
    endDate: [''],
  });

  get availableTechnologies(): SkillOption[] {
    const assigned = new Set(this.technologies().map(technology => technology.skillId));
    return this.technologyCatalog().filter(skill => !assigned.has(skill.id));
  }

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

  manageTechnologies(projectId: number): void {
    if (this.technologyProjectId() === projectId) {
      this.technologyProjectId.set(null);
      return;
    }
    this.technologyProjectId.set(projectId);
    this.selectedTechnologyId.set('');
    this.technologyError.set(null);
    this.technologyLoading.set(true);
    forkJoin({
      technologies: this.projectsApi.technologies(projectId),
      catalog: this.projectsApi.skillCatalog(),
    }).subscribe({
      next: result => {
        this.technologies.set(result.technologies);
        this.technologyCatalog.set(result.catalog);
        this.technologyLoading.set(false);
      },
      error: error => {
        this.technologyError.set(this.message(error, 'Could not load project technologies.'));
        this.technologyLoading.set(false);
      },
    });
  }

  addTechnology(projectId: number): void {
    const skillId = Number(this.selectedTechnologyId());
    if (!Number.isSafeInteger(skillId) || skillId <= 0 || this.technologySaving()) return;
    this.technologySaving.set(true);
    this.technologyError.set(null);
    this.successMessage.set(null);
    this.projectsApi.addTechnology(projectId, skillId).subscribe({
      next: technology => {
        this.technologies.update(current => [...current, technology].sort((a, b) => a.skillName.localeCompare(b.skillName)));
        this.selectedTechnologyId.set('');
        this.technologySaving.set(false);
        this.successMessage.set(`${technology.skillName} added to this project.`);
      },
      error: error => {
        this.technologyError.set(this.message(error, 'Could not add this technology.'));
        this.technologySaving.set(false);
      },
    });
  }

  removeTechnology(projectId: number, skillId: number): void {
    if (this.technologySaving()) return;
    this.technologySaving.set(true);
    this.technologyError.set(null);
    this.projectsApi.removeTechnology(projectId, skillId).subscribe({
      next: () => {
        const removed = this.technologies().find(technology => technology.skillId === skillId)?.skillName;
        this.technologies.update(current => current.filter(technology => technology.skillId !== skillId));
        this.technologySaving.set(false);
        if (removed) this.successMessage.set(`${removed} removed from this project.`);
      },
      error: error => {
        this.technologyError.set(this.message(error, 'Could not remove this technology.'));
        this.technologySaving.set(false);
      },
    });
  }

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
