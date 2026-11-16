import { Injectable, computed, signal } from '@angular/core';
import { AuthResponse, AuthenticatedUser, UserRole } from '../models/auth.models';

const SESSION_STORAGE_KEY = 'campusflow.auth.session';

@Injectable({ providedIn: 'root' })
export class AuthStateStore {
  private readonly session = signal<AuthResponse | null>(this.readStoredSession());
  private expirationTimer: ReturnType<typeof setTimeout> | undefined;
  readonly user = computed<AuthenticatedUser | null>(() => {
    const session = this.validSession();
    if (!session) return null;
    return { userId: session.userId, email: session.email, role: session.role, expiresAt: session.expiresAt };
  });
  readonly isAuthenticated = computed(() => this.validSession() !== null);

  constructor() {
    const session = this.validSession();
    if (session) {
      this.scheduleExpiration(session);
    } else if (this.session()) {
      this.removeStoredSession();
    }
  }

  get accessToken(): string | null { return this.validSession()?.accessToken ?? null; }

  setSession(session: AuthResponse): void {
    const expiresIn = Date.parse(session.expiresAt) - Date.now();
    if (expiresIn <= 0) {
      this.clear();
      return;
    }
    this.session.set(session);
    this.storeSession(session);
    this.scheduleExpiration(session);
  }

  clear(): void {
    if (this.expirationTimer !== undefined) clearTimeout(this.expirationTimer);
    this.expirationTimer = undefined;
    this.session.set(null);
    this.removeStoredSession();
  }

  private validSession(): AuthResponse | null {
    const current = this.session();
    return current && Date.parse(current.expiresAt) > Date.now() ? current : null;
  }

  private scheduleExpiration(session: AuthResponse): void {
    if (this.expirationTimer !== undefined) clearTimeout(this.expirationTimer);
    this.expirationTimer = setTimeout(() => this.clear(), Date.parse(session.expiresAt) - Date.now());
  }

  private storeSession(session: AuthResponse): void {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Storage can be unavailable in private browsing contexts.
    }
  }

  private removeStoredSession(): void {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore storage access failures.
    }
  }

  private readStoredSession(): AuthResponse | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      return isAuthResponse(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}

function isAuthResponse(value: unknown): value is AuthResponse {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate['accessToken'] === 'string'
    && typeof candidate['expiresAt'] === 'string'
    && typeof candidate['userId'] === 'number'
    && typeof candidate['email'] === 'string'
    && Object.values(UserRole).includes(candidate['role'] as UserRole);
}
