import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { StudentProject } from '../../models/student-project.model';
import { StudentProjectsComponent } from './student-projects.component';

const endpoint = `${environment.apiBaseUrl}/student/projects`;
const project: StudentProject = {
  id: 3, studentId: 8, title: 'Placement Portal', description: 'A team project',
  githubUrl: 'https://github.com/example/portal', liveDemoUrl: null,
  startDate: '2025-01-01', endDate: '2025-04-01',
  createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-04-01T00:00:00Z',
};

describe('StudentProjectsComponent', () => {
  let fixture: ComponentFixture<StudentProjectsComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentProjectsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(StudentProjectsComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('loads the signed-in student project list', () => {
    const request = http.expectOne(endpoint);
    expect(request.request.method).toBe('GET');
    request.flush([project]);
    expect(fixture.componentInstance.projects()).toEqual([project]);
  });

  it('creates a project and adds the persisted response to the list', () => {
    http.expectOne(endpoint).flush([]);
    const component = fixture.componentInstance;
    component.startCreate();
    component.form.setValue({
      title: 'Placement Portal', description: 'A team project',
      githubUrl: 'https://github.com/example/portal', liveDemoUrl: '',
      startDate: '2025-01-01', endDate: '2025-04-01',
    });
    component.save();

    const request = http.expectOne(endpoint);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      title: 'Placement Portal', description: 'A team project',
      githubUrl: 'https://github.com/example/portal', liveDemoUrl: null,
      startDate: '2025-01-01', endDate: '2025-04-01',
    });
    request.flush(project);
    expect(component.projects()).toEqual([project]);
  });

  it('rejects reversed project dates before sending a request', () => {
    http.expectOne(endpoint).flush([]);
    const component = fixture.componentInstance;
    component.startCreate();
    component.form.patchValue({ title: 'Placement Portal', startDate: '2025-04-01', endDate: '2025-01-01' });

    component.save();

    expect(component.formError()).toBe('The end date must be on or after the start date.');
    http.expectNone(endpoint);
  });

  it('rejects malformed project links before submitting', () => {
    http.expectOne(endpoint).flush([]);
    const component = fixture.componentInstance;
    component.startCreate();
    component.form.patchValue({ title: 'Placement Portal', githubUrl: 'not-a-url' });

    component.save();

    expect(component.form.controls.githubUrl.hasError('pattern')).toBe(true);
    http.expectNone(endpoint);
  });

  it('updates an existing project using the signed-in student endpoint', () => {
    http.expectOne(endpoint).flush([project]);
    const component = fixture.componentInstance;
    component.startEdit(project);
    component.form.patchValue({ description: 'Updated project summary' });
    component.save();

    const request = http.expectOne(`${endpoint}/${project.id}`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.description).toBe('Updated project summary');
    request.flush({ ...project, description: 'Updated project summary' });
    expect(component.projects()[0].description).toBe('Updated project summary');
  });

  it('deletes a project only after the component receives the confirmed action', () => {
    http.expectOne(endpoint).flush([project]);
    fixture.componentInstance.deleteProject(project.id);

    const request = http.expectOne(`${endpoint}/${project.id}`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
    expect(fixture.componentInstance.projects()).toEqual([]);
  });

  it('loads technologies from the catalog and supports adding a project technology', () => {
    http.expectOne(endpoint).flush([project]);
    const component = fixture.componentInstance;
    component.manageTechnologies(project.id);
    http.expectOne(`${endpoint}/${project.id}/skills`).flush([]);
    http.expectOne(`${environment.apiBaseUrl}/skills`).flush([{ id: 4, name: 'Angular' }]);
    expect(component.availableTechnologies).toEqual([{ id: 4, name: 'Angular' }]);

    component.selectedTechnologyId.set('4');
    component.addTechnology(project.id);
    const addRequest = http.expectOne(`${endpoint}/${project.id}/skills`);
    expect(addRequest.request.method).toBe('POST');
    expect(addRequest.request.body).toEqual({ skillId: 4 });
    addRequest.flush({ skillId: 4, skillName: 'Angular' });
    expect(component.technologies()).toEqual([{ skillId: 4, skillName: 'Angular' }]);
    expect(component.availableTechnologies).toEqual([]);
  });

  it('removes a technology from its project', () => {
    http.expectOne(endpoint).flush([project]);
    const component = fixture.componentInstance;
    component.manageTechnologies(project.id);
    http.expectOne(`${endpoint}/${project.id}/skills`).flush([{ skillId: 4, skillName: 'Angular' }]);
    http.expectOne(`${environment.apiBaseUrl}/skills`).flush([{ id: 4, name: 'Angular' }]);

    component.removeTechnology(project.id, 4);
    const request = http.expectOne(`${endpoint}/${project.id}/skills/4`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
    expect(component.technologies()).toEqual([]);
  });
});
