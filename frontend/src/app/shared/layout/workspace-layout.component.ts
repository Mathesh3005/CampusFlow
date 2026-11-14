import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthStateStore } from '../../core/auth/auth-state.store';
import { UserRole } from '../../core/models/auth.models';

interface WorkspaceNavItem {
  label: string;
  path: string;
  icon: string;
}

const studentNavigation: WorkspaceNavItem[] = [
  { label: 'Dashboard', path: 'dashboard', icon: 'dashboard' },
  { label: 'Jobs', path: 'jobs', icon: 'work_outline' },
  { label: 'Applications', path: 'applications', icon: 'description' },
  { label: 'Resumes', path: 'resumes', icon: 'article' },
  { label: 'Interviews', path: 'interviews', icon: 'event' },
  { label: 'Notifications', path: 'notifications', icon: 'notifications_none' },
];

const officerNavigation: WorkspaceNavItem[] = [
  { label: 'Dashboard', path: 'dashboard', icon: 'dashboard' },
  { label: 'Jobs', path: 'jobs', icon: 'work_outline' },
  { label: 'Applications', path: 'applications', icon: 'description' },
  { label: 'Interviews', path: 'interviews', icon: 'event' },
  { label: 'Notifications', path: 'notifications', icon: 'notifications_none' },
];

@Component({
  selector: 'app-workspace-layout',
  standalone: true,
  imports: [MatIconModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './workspace-layout.component.html',
  styleUrl: './workspace-layout.component.scss',
})
export class WorkspaceLayout {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthStateStore);
  readonly role = this.route.snapshot.data['role'] as UserRole;
  readonly user = this.auth.user;
  readonly navigation = this.role === UserRole.Student ? studentNavigation : officerNavigation;
  readonly roleLabel = computed(() => this.role === UserRole.Student ? 'Student' : 'Placement Officer');
  readonly mobileNavOpen = signal(false);

  @ViewChild('menuToggle') private menuToggle?: ElementRef<HTMLButtonElement>;
  @ViewChild('navigationElement') private navigationElement?: ElementRef<HTMLElement>;

  closeMobileNavigation(): void { this.mobileNavOpen.set(false); }
  toggleMobileNavigation(): void {
    if (this.mobileNavOpen()) {
      this.closeMobileNavigation();
      return;
    }
    this.mobileNavOpen.set(true);
    this.navigationElement?.nativeElement.querySelector<HTMLAnchorElement>('a')?.focus();
  }

  onSidebarEscape(event: Event): void {
    if (!this.mobileNavOpen()) return;
    event.preventDefault();
    this.closeMobileNavigation();
    this.menuToggle?.nativeElement.focus();
  }
}
