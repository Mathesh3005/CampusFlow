import { Routes } from '@angular/router';
import { authGuard, roleGuard } from '../../core/auth/auth.guards';
import { UserRole } from '../../core/models/auth.models';
import { WorkspaceLayout } from '../../shared/layout/workspace-layout.component';
import { NOTIFICATIONS_API } from '../notifications/services/notification-api';
import { StudentDashboardService } from './services/student-dashboard.service';
import { StudentNotificationsService } from './services/student-notifications.service';

export const studentRoutes: Routes = [{
  path: '',
  component: WorkspaceLayout,
  canActivate: [authGuard, roleGuard(UserRole.Student)],
  providers: [
    StudentDashboardService,
    StudentNotificationsService,
    { provide: NOTIFICATIONS_API, useExisting: StudentNotificationsService },
  ],
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
    {
      path: 'interviews',
      children: [
        { path: '', pathMatch: 'full', loadComponent: () => import('./pages/interviews/interviews-list.component').then(m => m.StudentInterviewsList) },
        { path: ':id', loadComponent: () => import('./pages/interviews/interview-details.component').then(m => m.StudentInterviewDetails) },
      ],
    },
    {
      path: 'notifications',
      children: [
        {
          path: '',
          pathMatch: 'full',
          loadComponent: () => import('../notifications/pages/notifications-list.component').then(m => m.NotificationsList),
          data: { notificationWorkspace: 'student' },
        },
        {
          path: ':id',
          loadComponent: () => import('../notifications/pages/notification-details.component').then(m => m.NotificationDetails),
          data: { notificationWorkspace: 'student' },
        },
      ],
    },
    { path: '**', redirectTo: 'dashboard' },
  ],
}];
