import { Component, DestroyRef, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthStateStore } from '../../core/auth/auth-state.store';
import { UserRole } from '../../core/models/auth.models';
import { NOTIFICATIONS_API, NOTIFICATIONS_DEFAULT_SORT, NOTIFICATIONS_PAGE_SIZE } from '../../features/notifications/services/notification-api';

interface WorkspaceNavItem {
  label: string;
  path: string;
  icon: string;
}

const studentNavigation: WorkspaceNavItem[] = [
  { label: 'Dashboard', path: 'dashboard', icon: 'dashboard' },
  { label: 'My profile', path: 'profile', icon: 'person' },
  { label: 'Projects', path: 'projects', icon: 'code' },
  { label: 'Skills', path: 'skills', icon: 'star' },
  { label: 'Jobs', path: 'jobs', icon: 'work_outline' },
  { label: 'Applications', path: 'applications', icon: 'description' },
  { label: 'Resumes', path: 'resumes', icon: 'article' },
  { label: 'Interviews', path: 'interviews', icon: 'event' },
  { label: 'Notifications', path: 'notifications', icon: 'notifications_none' },
  { label: 'Settings', path: 'settings', icon: 'settings' },
];

const officerNavigation: WorkspaceNavItem[] = [
  { label: 'Dashboard', path: 'dashboard', icon: 'dashboard' },
  { label: 'Students', path: 'students', icon: 'groups' },
  { label: 'Jobs', path: 'jobs', icon: 'work_outline' },
  { label: 'Applications', path: 'applications', icon: 'description' },
  { label: 'Analytics', path: 'analytics', icon: 'analytics' },
  { label: 'Interviews', path: 'interviews', icon: 'event' },
  { label: 'Notifications', path: 'notifications', icon: 'notifications_none' },
  { label: 'Settings', path: 'settings', icon: 'settings' },
];

const adminNavigation: WorkspaceNavItem[] = [
  { label: 'Dashboard', path: 'dashboard', icon: 'dashboard' },
  { label: 'Officers', path: 'officers', icon: 'badge' },
  { label: 'Settings', path: 'settings', icon: 'settings' },
];

@Component({
  selector: 'app-workspace-layout',
  standalone: true,
  imports: [MatIconModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './workspace-layout.component.html',
  styleUrl: './workspace-layout.component.scss',
})
export class WorkspaceLayout implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthStateStore);
  private readonly notifications = inject(NOTIFICATIONS_API, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  readonly role = this.route.snapshot.data['role'] as UserRole;
  readonly user = this.auth.user;
  readonly userInitial = computed(() => this.user()?.email?.trim().charAt(0).toUpperCase() || 'U');
  readonly roleDescription = computed(() => this.role === UserRole.Student ? 'Student portal'
    : this.role === UserRole.Admin ? 'Campus administration' : 'Placement team');
  readonly navigation = this.role === UserRole.Student ? studentNavigation
    : this.role === UserRole.Admin ? adminNavigation : officerNavigation;
  readonly showNotifications = this.navigation.some(item => item.path === 'notifications');
  readonly roleLabel = computed(() => this.role === UserRole.Student ? 'Student'
    : this.role === UserRole.Admin ? 'Administrator' : 'Placement Officer');
  readonly workspacePrefix = this.role === UserRole.Student ? 'student'
    : this.role === UserRole.Admin ? 'admin' : 'officer';
  readonly mobileNavOpen = signal(false);
  readonly unreadCount = this.notifications ? this.notifications.unreadOnLatestPage : signal<number | null>(null);
  readonly notificationSummaryUnavailable = signal(false);

  @ViewChild('menuToggle') private menuToggle?: ElementRef<HTMLButtonElement>;
  @ViewChild('navigationElement') private navigationElement?: ElementRef<HTMLElement>;

  ngOnInit(): void {
    this.notifications?.listNotifications({
      page: 0,
      size: NOTIFICATIONS_PAGE_SIZE,
      sort: NOTIFICATIONS_DEFAULT_SORT,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.notifications?.refreshUnreadCount().pipe(
        takeUntilDestroyed(this.destroyRef),
      ).subscribe({
        next: () => this.notificationSummaryUnavailable.set(false),
        error: () => this.notificationSummaryUnavailable.set(true),
      }),
      error: () => this.notificationSummaryUnavailable.set(true),
    });
  }

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

  logOut(): void {
    this.auth.clear();
    this.closeMobileNavigation();
    void this.router.navigateByUrl('/login');
  }
}
