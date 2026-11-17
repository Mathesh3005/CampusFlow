import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiError } from '../../../../core/http/api-error.handler';
import { AdminDashboard } from '../../models/admin.models';
import { AdminOfficersService } from '../../services/admin-officers.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <section class="admin-dashboard">
      <header class="page-heading dashboard-hero">
        <div>
          <span class="eyebrow">CAMPUSFLOW ADMINISTRATION</span>
          <h1>Platform overview</h1>
          <p>Track placement activity and keep officer access up to date.</p>
        </div>
        <a mat-flat-button color="primary" routerLink="/admin/officers">
          <mat-icon>person_add</mat-icon>
          Manage officers
        </a>
      </header>

      @if (errorMessage()) {
        <div class="state error" role="alert">
          <mat-icon>error_outline</mat-icon>
          <p>{{ errorMessage() }}</p>
          <button mat-stroked-button type="button" (click)="load()">Try again</button>
        </div>
      } @else if (loading()) {
        <div class="state" role="status">
          <mat-icon class="spin">progress_activity</mat-icon>
          <p>Loading platform metrics…</p>
        </div>
      } @else if (dashboard(); as data) {
        <section class="metrics-section" aria-labelledby="metrics-heading">
        <header class="section-heading"><div><h2 id="metrics-heading">Platform at a glance</h2><p>Live totals from your CampusFlow workspace</p></div><span class="live-summary"><span></span>Live data</span></header>
        <div class="metric-grid">
          <article class="metric-card">
            <span class="metric-icon"><mat-icon>groups</mat-icon></span>
            <div>
              <p class="metric-label">Total users</p>
              <p class="metric-value">{{ data.totalUsers }}</p>
            </div>
          </article>
          <article class="metric-card">
            <span class="metric-icon"><mat-icon>school</mat-icon></span>
            <div>
              <p class="metric-label">Students</p>
              <p class="metric-value">{{ data.totalStudents }}</p>
            </div>
          </article>
          <article class="metric-card">
            <span class="metric-icon"><mat-icon>badge</mat-icon></span>
            <div>
              <p class="metric-label">Placement officers</p>
              <p class="metric-value">{{ data.totalOfficers }}</p>
              <p class="metric-note">{{ data.activeOfficers }} active</p>
            </div>
          </article>
          <article class="metric-card">
            <span class="metric-icon"><mat-icon>work_outline</mat-icon></span>
            <div>
              <p class="metric-label">Jobs posted</p>
              <p class="metric-value">{{ data.totalJobs }}</p>
              <p class="metric-note">{{ data.publishedJobs }} published</p>
            </div>
          </article>
          <article class="metric-card">
            <span class="metric-icon"><mat-icon>description</mat-icon></span>
            <div>
              <p class="metric-label">Applications</p>
              <p class="metric-value">{{ data.totalApplications }}</p>
            </div>
          </article>
        </div>
        </section>

        <section class="admin-links" aria-label="Administration shortcuts">
          <article>
            <mat-icon>manage_accounts</mat-icon>
            <h2>Officer accounts</h2>
            <p>Create placement officer accounts and pause access when needed.</p>
            <a mat-stroked-button routerLink="/admin/officers">Open officer directory</a>
          </article>
          <article>
            <mat-icon>lock_reset</mat-icon>
            <h2>Your account</h2>
            <p>Update the credentials used to administer CampusFlow.</p>
            <a mat-stroked-button routerLink="/admin/settings">Open settings</a>
          </article>
        </section>
      }
    </section>
  `,
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  private readonly admin = inject(AdminOfficersService);

  readonly dashboard = signal<AdminDashboard | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.admin.getDashboard().subscribe({
      next: data => {
        this.dashboard.set(data);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(error instanceof ApiError ? error.message : 'Unable to load platform metrics.');
      },
    });
  }
}
