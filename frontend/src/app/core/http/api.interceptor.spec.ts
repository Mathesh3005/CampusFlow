import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthStateStore } from '../auth/auth-state.store';
import { UserRole } from '../models/auth.models';
import { environment } from '../../../environments/environment';
import { ApiError } from './api-error.handler';
import { apiInterceptor } from './api.interceptor';

const browserOrigin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
const configuredApiRoot = new URL(environment.apiBaseUrl, browserOrigin).toString().replace(/\/+$/, '');

describe('apiInterceptor', () => {
  let http: HttpClient;
  let requests: HttpTestingController;
  let authState: AuthStateStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
    authState = TestBed.inject(AuthStateStore);
    authState.setSession({
      accessToken: 'test-access-token',
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      userId: 7,
      email: 'student@example.edu',
      role: UserRole.Student,
    });
  });

  afterEach(() => requests.verify());

  it('attaches the bearer token to requests under the configured API path', () => {
    const apiUrl = `${configuredApiRoot}/jobs`;
    http.get(apiUrl).subscribe();
    const request = requests.expectOne(apiUrl);

    expect(request.request.headers.get('Authorization')).toBe('Bearer test-access-token');
    request.flush({});
  });

  it.each(['/assets/logo.svg', '/other-service/data', '/api/v10/jobs'])(
    'does not attach the bearer token to unrelated same-origin path %s', path => {
      http.get(path).subscribe();
      const request = requests.expectOne(path);

      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({});
    },
  );

  it('does not clear auth or normalize an external-origin 401', () => {
    let receivedError: unknown;
    http.get('https://external.example/data').subscribe({ error: error => receivedError = error });
    const request = requests.expectOne('https://external.example/data');
    request.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(receivedError).toBeInstanceOf(HttpErrorResponse);
    expect(authState.isAuthenticated()).toBe(true);
  });

  it('normalizes a CampusFlow API 401 and clears the session', () => {
    let receivedError: unknown;
    const apiUrl = `${configuredApiRoot}/jobs`;
    http.get(apiUrl).subscribe({ error: error => receivedError = error });
    const request = requests.expectOne(apiUrl);
    request.flush({ status: 401, detail: 'Invalid token' }, { status: 401, statusText: 'Unauthorized' });

    expect(receivedError).toBeInstanceOf(ApiError);
    expect(authState.isAuthenticated()).toBe(false);
  });
});
