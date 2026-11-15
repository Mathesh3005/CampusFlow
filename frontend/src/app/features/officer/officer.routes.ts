import { Routes } from '@angular/router';
import { authGuard, roleGuard } from '../../core/auth/auth.guards';
import { UserRole } from '../../core/models/auth.models';
import { WorkspaceLayout } from '../../shared/layout/workspace-layout.component';
import { NOTIFICATIONS_API } from '../notifications/services/notification-api';
import { OfficerDashboardService } from './services/officer-dashboard.service';
import { OfficerNotificationsService } from './services/officer-notifications.service';
import { OfficerJobsList } from './pages/jobs/jobs-list.component';
import { OfficerApplicationsList } from './pages/applications/applications-list.component';

export const officerRoutes: Routes = [{
  path: '',
  component: WorkspaceLayout,
  canActivate: [authGuard, roleGuard(UserRole.PlacementOfficer)],
  providers: [
    OfficerDashboardService,
    OfficerNotificationsService,
    { provide: NOTIFICATIONS_API, useExisting: OfficerNotificationsService },
  ],
  data: { role: UserRole.PlacementOfficer },
  children: [
    { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    {
      path: 'dashboard',
      loadComponent: () => import('./pages/dashboard/officer-dashboard.component').then(m => m.OfficerDashboard),
    },
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
    {
      path: 'interviews',
      children: [
        { path: '', pathMatch: 'full', loadComponent: () => import('./pages/interviews/interviews-list.component').then(m => m.OfficerInterviewsList) },
        { path: 'new', loadComponent: () => import('./pages/interviews/interview-form.component').then(m => m.OfficerInterviewForm) },
        { path: ':id/edit', loadComponent: () => import('./pages/interviews/interview-form.component').then(m => m.OfficerInterviewForm) },
        { path: ':id', loadComponent: () => import('./pages/interviews/interview-details.component').then(m => m.OfficerInterviewDetails) },
      ],
    },
    {
      path: 'notifications',
      children: [
        {
          path: '',
          pathMatch: 'full',
          loadComponent: () => import('../notifications/pages/notifications-list.component').then(m => m.NotificationsList),
          data: { notificationWorkspace: 'officer' },
        },
        {
          path: ':id',
          loadComponent: () => import('../notifications/pages/notification-details.component').then(m => m.NotificationDetails),
          data: { notificationWorkspace: 'officer' },
        },
      ],
    },
    { path: '**', redirectTo: 'dashboard' },
  ],
}];
