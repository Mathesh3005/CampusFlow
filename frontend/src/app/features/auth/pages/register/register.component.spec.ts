import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('posts validated student registration data and opens the student workspace', async () => {
    const component = fixture.componentInstance;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    component.form.setValue({
      fullName: 'Taylor Student',
      email: 'taylor@example.edu',
      registerNumber: 'REG-21',
      department: 'Computer Science',
      graduationYear: 2028,
      password: 'a-secure-password',
      confirmPassword: 'a-secure-password',
    });

    component.submit();
    const request = http.expectOne(`${environment.apiBaseUrl}/auth/register`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      fullName: 'Taylor Student',
      email: 'taylor@example.edu',
      registerNumber: 'REG-21',
      department: 'Computer Science',
      graduationYear: 2028,
      password: 'a-secure-password',
    });
    request.flush({
      accessToken: 'test-token', tokenType: 'Bearer', expiresAt: new Date(Date.now() + 60000).toISOString(),
      userId: 21, email: 'taylor@example.edu', role: 'STUDENT',
    });
    await fixture.whenStable();

    expect(component.submitting()).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/student/dashboard');
  });

  it('blocks registration when passwords do not match', () => {
    fixture.componentInstance.form.setValue({
      fullName: 'Taylor Student',
      email: 'taylor@example.edu',
      registerNumber: 'REG-21',
      department: 'Computer Science',
      graduationYear: 2028,
      password: 'a-secure-password',
      confirmPassword: 'a-different-password',
    });

    fixture.componentInstance.submit();

    expect(fixture.componentInstance.form.hasError('passwordsMismatch')).toBe(true);
    http.expectNone(`${environment.apiBaseUrl}/auth/register`);
  });
});
