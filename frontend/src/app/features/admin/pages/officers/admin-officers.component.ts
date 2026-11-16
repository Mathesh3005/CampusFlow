import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiError } from '../../../../core/http/api-error.handler';
import { PageResponse } from '../../../../core/models/domain.models';
import { PlacementOfficerAdmin } from '../../models/admin.models';
import { AdminOfficersService } from '../../services/admin-officers.service';

@Component({
  selector: 'app-admin-officers',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, MatButtonModule, MatIconModule],
  templateUrl: './admin-officers.component.html',
  styleUrl: './admin-officers.component.scss',
})
export class AdminOfficersComponent implements OnInit {
  private readonly admin = inject(AdminOfficersService);
  private readonly fb = new FormBuilder();

  readonly page = signal<PageResponse<PlacementOfficerAdmin> | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly search = signal('');
  readonly pageIndex = signal(0);
  readonly showCreateForm = signal(false);
  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);
  readonly createSuccess = signal<string | null>(null);
  readonly togglingId = signal<number | null>(null);

  readonly createForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    employeeId: ['', [Validators.required, Validators.maxLength(50)]],
    department: ['', [Validators.required, Validators.maxLength(120)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.admin.list({ search: this.search(), page: this.pageIndex(), size: 10, sort: 'fullName,asc' }).subscribe({
      next: page => {
        if (page.totalPages > 0 && page.page >= page.totalPages) {
          this.pageIndex.set(page.totalPages - 1);
          this.load();
          return;
        }
        this.page.set(page);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(messageFor(error, 'Officer accounts could not be loaded.'));
      },
    });
  }

  applySearch(value: string): void {
    this.search.set(value);
    this.pageIndex.set(0);
    this.load();
  }

  changePage(delta: number): void {
    const current = this.page();
    if (!current) return;
    const next = this.pageIndex() + delta;
    if (next < 0 || next >= current.totalPages) return;
    this.pageIndex.set(next);
    this.load();
  }

  toggleCreate(): void {
    this.showCreateForm.update(open => !open);
    this.createError.set(null);
    this.createSuccess.set(null);
    if (!this.showCreateForm()) this.createForm.reset();
  }

  create(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.creating.set(true);
    this.createError.set(null);
    this.createSuccess.set(null);
    this.admin.create(this.createForm.getRawValue()).subscribe({
      next: officer => {
        this.creating.set(false);
        this.createSuccess.set(`${officer.fullName} can now sign in with ${officer.email}.`);
        this.createForm.reset();
        this.showCreateForm.set(false);
        this.pageIndex.set(0);
        this.load();
      },
      error: (error: unknown) => {
        this.creating.set(false);
        this.createError.set(messageFor(error, 'The officer account could not be created.'));
      },
    });
  }

  setActive(officer: PlacementOfficerAdmin): void {
    this.togglingId.set(officer.id);
    this.admin.setActive(officer.id, !officer.active).subscribe({
      next: updated => {
        this.togglingId.set(null);
        this.page.update(page => page
          ? { ...page, content: page.content.map(item => item.id === updated.id ? updated : item) }
          : page);
      },
      error: (error: unknown) => {
        this.togglingId.set(null);
        this.errorMessage.set(messageFor(error, 'The officer account could not be updated.'));
      },
    });
  }
}

function messageFor(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}
