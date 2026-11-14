import { Routes } from '@angular/router';
import { authGuard, roleGuard } from '../../core/auth/auth.guards';
import { UserRole } from '../../core/models/auth.models';
import { WorkspaceLayout } from '../../shared/layout/workspace-layout.component';
import { FeaturePlaceholder } from '../../shared/pages/feature-placeholder.component';

export const officerRoutes: Routes = [{
  path: '',
  component: WorkspaceLayout,
  canActivate: [authGuard, roleGuard(UserRole.PlacementOfficer)],
  data: { role: UserRole.PlacementOfficer },
  children: [
    { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    { path: 'dashboard', component: FeaturePlaceholder, data: { title: 'Placement officer dashboard' } },
    { path: 'jobs', component: FeaturePlaceholder, data: { title: 'Jobs' } },
    { path: 'applications', component: FeaturePlaceholder, data: { title: 'Applications' } },
    { path: 'interviews', component: FeaturePlaceholder, data: { title: 'Interviews' } },
    { path: 'notifications', component: FeaturePlaceholder, data: { title: 'Notifications' } },
    { path: '**', redirectTo: 'dashboard' },
  ],
}];
