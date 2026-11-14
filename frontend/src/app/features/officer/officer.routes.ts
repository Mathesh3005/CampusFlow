import { Routes } from '@angular/router';
import { authGuard, roleGuard } from '../../core/auth/auth.guards';
import { UserRole } from '../../core/models/auth.models';
import { WorkspaceLayout } from '../../shared/layout/workspace-layout.component';
import { FeaturePlaceholder } from '../../shared/pages/feature-placeholder.component';
import { OfficerJobsList } from './pages/jobs/jobs-list.component';
import { OfficerApplicationsList } from './pages/applications/applications-list.component';

export const officerRoutes: Routes = [{
  path: '',
  component: WorkspaceLayout,
  canActivate: [authGuard, roleGuard(UserRole.PlacementOfficer)],
  data: { role: UserRole.PlacementOfficer },
  children: [
    { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    { path: 'dashboard', component: FeaturePlaceholder, data: { title: 'Placement officer dashboard' } },
    {
      path: 'jobs',
      children: [
        { path: '', pathMatch: 'full', component: OfficerJobsList },
        {
          path: 'new',
          loadComponent: () => import('./pages/jobs/job-create.component').then(m => m.OfficerJobCreate),
        },
        {
          path: ':id/edit',
          loadComponent: () => import('./pages/jobs/job-create.component').then(m => m.OfficerJobCreate),
        },
        {
          path: ':id',
          loadComponent: () => import('./pages/jobs/job-details.component').then(m => m.OfficerJobDetails),
        },
      ],
    },
    {
      path: 'applications',
      children: [
        { path: '', pathMatch: 'full', component: OfficerApplicationsList },
        {
          path: ':id',
          loadComponent: () => import('./pages/applications/application-details.component')
            .then(m => m.OfficerApplicationDetails),
        },
      ],
    },
    { path: 'interviews', component: FeaturePlaceholder, data: { title: 'Interviews' } },
    { path: 'notifications', component: FeaturePlaceholder, data: { title: 'Notifications' } },
    { path: '**', redirectTo: 'dashboard' },
  ],
}];
