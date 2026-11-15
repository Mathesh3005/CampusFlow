import { Component, DestroyRef, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
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
export class WorkspaceLayout implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthStateStore);
  private readonly notifications = inject(NOTIFICATIONS_API);
  private readonly destroyRef = inject(DestroyRef);
  readonly role = this.route.snapshot.data['role'] as UserRole;
  readonly user = this.auth.user;
  readonly navigation = this.role === UserRole.Student ? studentNavigation : officerNavigation;
  readonly roleLabel = computed(() => this.role === UserRole.Student ? 'Student' : 'Placement Officer');
  readonly mobileNavOpen = signal(false);
  readonly unreadCount = this.notifications.unreadOnLatestPage;
  readonly notificationSummaryUnavailable = signal(false);

  @ViewChild('menuToggle') private menuToggle?: ElementRef<HTMLButtonElement>;
  @ViewChild('navigationElement') private navigationElement?: ElementRef<HTMLElement>;

  ngOnInit(): void {
    this.notifications.listNotifications({
      page: 0,
      size: NOTIFICATIONS_PAGE_SIZE,
      sort: NOTIFICATIONS_DEFAULT_SORT,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.notificationSummaryUnavailable.set(false),
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
}
