package com.campusflow.service;

import com.campusflow.entity.Project;
import com.campusflow.entity.Student;
import com.campusflow.repository.ProjectRepository;
import com.campusflow.repository.ProjectSkillRepository;
import com.campusflow.repository.SkillRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.springframework.security.access.AccessDeniedException;

class ProjectSkillServiceTest {
    private final ProjectSkillRepository projectSkills = mock(ProjectSkillRepository.class);
    private final ProjectRepository projects = mock(ProjectRepository.class);
    private final SkillRepository skills = mock(SkillRepository.class);
    private final ProjectSkillService service = new ProjectSkillService(projectSkills, projects, skills);

    @Test
    void anotherStudentCannotReadProjectTechnologies() {
        Student owner = mock(Student.class);
        Project project = mock(Project.class);
        when(projects.findById(17L)).thenReturn(Optional.of(project));
        when(project.getStudent()).thenReturn(owner);
        when(owner.getId()).thenReturn(9L);

        assertThrows(AccessDeniedException.class, () -> service.getProjectSkills(17L, 10L));

        verify(projectSkills, never()).findByProjectId(17L);
    }
}
