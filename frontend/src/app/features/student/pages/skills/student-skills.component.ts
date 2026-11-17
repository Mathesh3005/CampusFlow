import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiError } from '../../../../core/http/api-error.handler';
import { ProficiencyLevel, SkillOption, StudentSkill } from '../../models/student-skill.model';
import { StudentSkillsService } from '../../services/student-skills.service';

@Component({
  selector: 'app-student-skills',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './student-skills.component.html',
  styleUrl: './student-skills.component.scss',
})
export class StudentSkillsComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly skillsApi = inject(StudentSkillsService);
  readonly skills = signal<StudentSkill[]>([]);
  readonly catalog = signal<SkillOption[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly removingId = signal<number | null>(null);
  readonly levels: ProficiencyLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
  readonly form = this.formBuilder.nonNullable.group({
    skillId: ['', Validators.required],
    proficiencyLevel: ['INTERMEDIATE' as ProficiencyLevel, Validators.required],
  });

  get availableSkills(): SkillOption[] {
    const assigned = new Set(this.skills().map(skill => skill.skillId));
    return this.catalog().filter(skill => !assigned.has(skill.id));
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({ skills: this.skillsApi.list(), catalog: this.skillsApi.catalog() }).subscribe({
      next: result => {
        this.skills.set(result.skills);
        this.catalog.set(result.catalog);
        this.loading.set(false);
      },
      error: error => {
        this.errorMessage.set(this.message(error, 'Could not load your skills.'));
        this.loading.set(false);
      },
    });
  }

  add(): void {
    if (this.form.invalid || this.saving()) { this.form.markAllAsTouched(); return; }
    const { skillId, proficiencyLevel } = this.form.getRawValue();
    this.saving.set(true);
    this.errorMessage.set(null);
    this.skillsApi.add(Number(skillId), proficiencyLevel).subscribe({
      next: skill => {
        this.skills.update(current => [...current, skill].sort((a, b) => a.skillName.localeCompare(b.skillName)));
        this.form.reset({ skillId: '', proficiencyLevel: 'INTERMEDIATE' });
        this.saving.set(false);
        this.successMessage.set(`${skill.skillName} added to your profile.`);
      },
      error: error => { this.errorMessage.set(this.message(error, 'Could not add this skill.')); this.saving.set(false); },
    });
  }

  updateProficiency(skillId: number, event: Event): void {
    const value = (event.target as HTMLSelectElement).value as ProficiencyLevel;
    if (!this.levels.includes(value)) return;
    const current = this.skills().find(skill => skill.skillId === skillId);
    if (!current || current.proficiencyLevel === value) return;
    const previousLevel = current.proficiencyLevel;
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.skillsApi.update(skillId, value).subscribe({
      next: saved => this.skills.update(current => current.map(skill => skill.skillId === skillId ? saved : skill)),
      error: error => {
        (event.target as HTMLSelectElement).value = previousLevel;
        this.errorMessage.set(this.message(error, 'Could not update proficiency.'));
      },
    });
  }

  remove(skillId: number): void {
    this.skillsApi.remove(skillId).subscribe({
      next: () => {
        const removed = this.skills().find(skill => skill.skillId === skillId)?.skillName;
        this.skills.update(current => current.filter(skill => skill.skillId !== skillId));
        this.removingId.set(null);
        this.successMessage.set(removed ? `${removed} removed from your profile.` : 'Skill removed.');
      },
      error: error => { this.errorMessage.set(this.message(error, 'Could not remove this skill.')); this.removingId.set(null); },
    });
  }

  private message(error: unknown, fallback: string): string {
    return error instanceof ApiError && error.message ? error.message : fallback;
  }
}
