package com.campusflow.controller;

import com.campusflow.dto.projectskill.ProjectSkillRequestDto;
import com.campusflow.dto.projectskill.ProjectSkillResponseDto;
import com.campusflow.entity.ProjectSkill;
import com.campusflow.service.AuthenticatedStudentService;
import com.campusflow.service.ProjectSkillService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/student/projects/{projectId}/skills")
@PreAuthorize("hasRole('STUDENT')")
public class StudentProjectSkillController {
    private final AuthenticatedStudentService authenticatedStudents;
    private final ProjectSkillService projectSkills;

    public StudentProjectSkillController(AuthenticatedStudentService authenticatedStudents,
                                         ProjectSkillService projectSkills) {
        this.authenticatedStudents = authenticatedStudents;
        this.projectSkills = projectSkills;
    }

    @GetMapping
    public List<ProjectSkillResponseDto> list(JwtAuthenticationToken authentication,
                                              @PathVariable Long projectId) {
        Long studentId = authenticatedStudents.currentStudent(authentication).getId();
        return projectSkills.getProjectSkills(projectId, studentId).stream()
                .map(StudentProjectSkillController::toResponse).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectSkillResponseDto add(JwtAuthenticationToken authentication,
                                       @PathVariable Long projectId,
                                       @Valid @RequestBody ProjectSkillRequestDto request) {
        Long studentId = authenticatedStudents.currentStudent(authentication).getId();
        return toResponse(projectSkills.addSkillToProject(projectId, request.getSkillId(), studentId));
    }

    @DeleteMapping("/{skillId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(JwtAuthenticationToken authentication, @PathVariable Long projectId,
                       @PathVariable Long skillId) {
        projectSkills.removeSkillFromProject(projectId, skillId,
                authenticatedStudents.currentStudent(authentication).getId());
    }

    private static ProjectSkillResponseDto toResponse(ProjectSkill projectSkill) {
        ProjectSkillResponseDto response = new ProjectSkillResponseDto();
        response.setSkillId(projectSkill.getSkill().getId());
        response.setSkillName(projectSkill.getSkill().getName());
        return response;
    }
}
