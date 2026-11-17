import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { StudentSkill } from '../../models/student-skill.model';
import { StudentSkillsComponent } from './student-skills.component';

const studentSkillsUrl = `${environment.apiBaseUrl}/student/skills`;
const catalogUrl = `${environment.apiBaseUrl}/skills`;
const javaSkill: StudentSkill = {
  skillId: 1, skillName: 'Java', proficiencyLevel: 'ADVANCED', createdAt: '2026-01-10T00:00:00Z',
};

describe('StudentSkillsComponent', () => {
  let fixture: ComponentFixture<StudentSkillsComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentSkillsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(StudentSkillsComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('loads the current profile skills and curated catalog', () => {
    const currentSkills = http.expectOne(studentSkillsUrl);
    const catalog = http.expectOne(catalogUrl);
    expect(currentSkills.request.method).toBe('GET');
    expect(catalog.request.method).toBe('GET');
    currentSkills.flush([javaSkill]);
    catalog.flush([{ id: 1, name: 'Java' }, { id: 2, name: 'Python' }]);

    expect(fixture.componentInstance.skills()).toEqual([javaSkill]);
    expect(fixture.componentInstance.availableSkills).toEqual([{ id: 2, name: 'Python' }]);
  });

  it('adds a catalog skill with the chosen proficiency', () => {
    http.expectOne(studentSkillsUrl).flush([]);
    http.expectOne(catalogUrl).flush([{ id: 1, name: 'Java' }]);
    fixture.componentInstance.form.setValue({ skillId: '1', proficiencyLevel: 'ADVANCED' });
    fixture.componentInstance.add();

    const request = http.expectOne(studentSkillsUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ skillId: 1, proficiencyLevel: 'ADVANCED' });
    request.flush(javaSkill);
    expect(fixture.componentInstance.skills()).toEqual([javaSkill]);
  });

  it('updates proficiency using the owned skill endpoint', () => {
    http.expectOne(studentSkillsUrl).flush([javaSkill]);
    http.expectOne(catalogUrl).flush([{ id: 1, name: 'Java' }]);
    fixture.componentInstance.updateProficiency(1, { target: { value: 'INTERMEDIATE' } } as unknown as Event);

    const request = http.expectOne(`${studentSkillsUrl}/1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ skillId: 1, proficiencyLevel: 'INTERMEDIATE' });
    request.flush({ ...javaSkill, proficiencyLevel: 'INTERMEDIATE' });
    expect(fixture.componentInstance.skills()[0].proficiencyLevel).toBe('INTERMEDIATE');
  });

  it('restores the selected proficiency when the API update fails', () => {
    http.expectOne(studentSkillsUrl).flush([javaSkill]);
    http.expectOne(catalogUrl).flush([{ id: 1, name: 'Java' }]);
    const select = { value: 'BEGINNER' } as HTMLSelectElement;

    fixture.componentInstance.updateProficiency(1, { target: select } as unknown as Event);
    http.expectOne(`${studentSkillsUrl}/1`).flush({ detail: 'Unavailable' }, { status: 503, statusText: 'Service Unavailable' });

    expect(select.value).toBe('ADVANCED');
    expect(fixture.componentInstance.skills()[0].proficiencyLevel).toBe('ADVANCED');
    expect(fixture.componentInstance.errorMessage()).toBeTruthy();
  });
});
