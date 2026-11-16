import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { StudentProfile } from '../../models/student-profile.model';
import { StudentProfileComponent } from './student-profile.component';

const profile: StudentProfile = {
  id: 7,
  registerNumber: 'REG-7',
  fullName: 'Taylor Student',
  department: 'Computer Science',
  graduationYear: 2028,
  cgpa: 8.25,
  phone: '5550100',
  email: 'taylor@example.edu',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('StudentProfileComponent', () => {
  let fixture: ComponentFixture<StudentProfileComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentProfileComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(StudentProfileComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('loads the signed-in student profile from the API', () => {
    const request = http.expectOne(`${environment.apiBaseUrl}/student/profile`);
    expect(request.request.method).toBe('GET');
    request.flush(profile);
    fixture.detectChanges();

    expect(fixture.componentInstance.profile()?.registerNumber).toBe('REG-7');
    expect(fixture.nativeElement.querySelector('input[formControlName="fullName"]').value).toBe('Taylor Student');
    expect(fixture.nativeElement.querySelector('input[readonly]').value).toBe('taylor@example.edu');
  });

  it('submits editable fields and reflects the saved backend response', () => {
    http.expectOne(`${environment.apiBaseUrl}/student/profile`).flush(profile);
    fixture.componentInstance.form.setValue({
      fullName: 'Taylor S.',
      department: 'Computer Science',
      graduationYear: 2028,
      cgpa: '8.5',
      phone: '',
    });

    fixture.componentInstance.save();
    const request = http.expectOne(`${environment.apiBaseUrl}/student/profile`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      fullName: 'Taylor S.',
      department: 'Computer Science',
      graduationYear: 2028,
      cgpa: 8.5,
      phone: null,
    });
    request.flush({ ...profile, fullName: 'Taylor S.', cgpa: 8.5, phone: null });
    expect(fixture.componentInstance.successMessage()).toBe('Your profile has been saved.');
    expect(fixture.componentInstance.profile()?.fullName).toBe('Taylor S.');
  });

  it('prevents saving an invalid CGPA', () => {
    http.expectOne(`${environment.apiBaseUrl}/student/profile`).flush(profile);
    fixture.componentInstance.form.controls.cgpa.setValue('10.5');

    fixture.componentInstance.save();

    expect(fixture.componentInstance.form.controls.cgpa.invalid).toBe(true);
    http.expectNone(`${environment.apiBaseUrl}/student/profile`);
  });
});
