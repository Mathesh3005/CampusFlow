import { Routes } from '@angular/router';
import { loginGuard } from './core/auth/auth.guards';
import { AccessDenied } from './shared/pages/access-denied.component';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () =>
      import('./features/auth/pages/login/login').then(
        (m) => m.Login
      ),
  },
  {
    path: 'register',
    canActivate: [loginGuard],
    loadComponent: () => import('./features/auth/pages/register/register.component').then(m => m.RegisterComponent),
  },
  { path: 'access-denied', component: AccessDenied },
  {
    path: 'student',
    loadChildren: () => import('./features/student/student.routes').then(m => m.studentRoutes),
  },
  {
    path: 'officer',
    loadChildren: () => import('./features/officer/officer.routes').then(m => m.officerRoutes),
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
