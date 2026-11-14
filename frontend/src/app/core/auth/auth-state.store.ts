import { Injectable, computed, signal } from '@angular/core';
import { AuthResponse, AuthenticatedUser } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthStateStore {
  private readonly session = signal<AuthResponse | null>(null);
  private expirationTimer: ReturnType<typeof setTimeout> | undefined;
  readonly user = computed<AuthenticatedUser | null>(() => {
    const session = this.validSession();
    if (!session) return null;
    return { userId: session.userId, email: session.email, role: session.role, expiresAt: session.expiresAt };
  });
  readonly isAuthenticated = computed(() => this.validSession() !== null);

  get accessToken(): string | null { return this.validSession()?.accessToken ?? null; }

  setSession(session: AuthResponse): void {
    const expiresIn = Date.parse(session.expiresAt) - Date.now();
    if (expiresIn <= 0) {
      this.clear();
      return;
    }
    if (this.expirationTimer !== undefined) clearTimeout(this.expirationTimer);
    this.session.set(session);
    this.expirationTimer = setTimeout(() => this.clear(), expiresIn);
  }

  clear(): void {
    if (this.expirationTimer !== undefined) clearTimeout(this.expirationTimer);
    this.expirationTimer = undefined;
    this.session.set(null);
  }

  private validSession(): AuthResponse | null {
    const current = this.session();
    return current && Date.parse(current.expiresAt) > Date.now() ? current : null;
  }
}
