import { Routes } from '@angular/router';
import { authGuard, roleGuard } from '../../core/auth/auth.guards';
import { UserRole } from '../../core/models/auth.models';
import { WorkspaceLayout } from '../../shared/layout/workspace-layout.component';

export const adminRoutes: Routes = [{
  path: '',
  component: WorkspaceLayout,
  canActivate: [authGuard, roleGuard(UserRole.Admin)],
  data: { role: UserRole.Admin },
  children: [
    { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    {
      path: 'dashboard',
      loadComponent: () => import('./pages/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
    },
    {
      path: 'officers',
      loadComponent: () => import('./pages/officers/admin-officers.component').then(m => m.AdminOfficersComponent),
    },
    {
      path: 'settings',
      loadComponent: () => import('../account/pages/account-settings.component').then(m => m.AccountSettingsComponent),
    },
    { path: '**', redirectTo: 'dashboard' },
  ],
}];
