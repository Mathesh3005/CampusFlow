import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStateStore } from './auth-state.store';
import { AuthResponse, LoginRequest, RegisterStudentRequest } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly state = inject(AuthStateStore);
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;

  readonly user = this.state.user;
  readonly isAuthenticated = this.state.isAuthenticated;

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, request).pipe(tap(response => this.accept(response)));
  }

  registerStudent(request: RegisterStudentRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, request).pipe(tap(response => this.accept(response)));
  }

  private accept(response: AuthResponse): void { this.state.setSession(response); }
}
