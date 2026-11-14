import { Routes } from '@angular/router';
import { authGuard, roleGuard } from '../../core/auth/auth.guards';
import { UserRole } from '../../core/models/auth.models';
import { WorkspaceLayout } from '../../shared/layout/workspace-layout.component';
import { FeaturePlaceholder } from '../../shared/pages/feature-placeholder.component';

export const studentRoutes: Routes = [{
  path: '',
  component: WorkspaceLayout,
  canActivate: [authGuard, roleGuard(UserRole.Student)],
  data: { role: UserRole.Student },
  children: [
    { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.StudentDashboard) },
    {
      path: 'jobs',
      children: [
        { path: '', pathMatch: 'full', loadComponent: () => import('./pages/jobs/jobs-list.component').then(m => m.StudentJobsList) },
        { path: ':id', loadComponent: () => import('./pages/jobs/job-details.component').then(m => m.StudentJobDetails) },
      ],
    },
    {
      path: 'applications',
      children: [
        { path: '', pathMatch: 'full', loadComponent: () => import('./pages/applications/applications-list.component').then(m => m.StudentApplicationsList) },
        { path: ':id', loadComponent: () => import('./pages/applications/application-details.component').then(m => m.StudentApplicationDetails) },
      ],
    },
    { path: 'resumes', loadComponent: () => import('./pages/resumes/resumes-page.component').then(m => m.StudentResumesPage) },
    { path: 'interviews', component: FeaturePlaceholder, data: { title: 'Interviews' } },
    { path: 'notifications', component: FeaturePlaceholder, data: { title: 'Notifications' } },
    { path: '**', redirectTo: 'dashboard' },
  ],
}];
