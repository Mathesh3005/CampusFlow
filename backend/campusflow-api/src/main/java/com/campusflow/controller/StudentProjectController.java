package com.campusflow.controller;

import com.campusflow.dto.project.ProjectRequestDto;
import com.campusflow.dto.project.ProjectResponseDto;
import com.campusflow.mapper.ProjectMapper;
import com.campusflow.service.AuthenticatedStudentService;
import com.campusflow.service.ProjectService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/student/projects")
@PreAuthorize("hasRole('STUDENT')")
public class StudentProjectController {
    private final AuthenticatedStudentService authenticatedStudents;
    private final ProjectService projects;

    public StudentProjectController(AuthenticatedStudentService authenticatedStudents,
                                    ProjectService projects) {
        this.authenticatedStudents = authenticatedStudents;
        this.projects = projects;
    }

    @GetMapping
    public List<ProjectResponseDto> list(JwtAuthenticationToken authentication) {
        Long studentId = authenticatedStudents.currentStudent(authentication).getId();
        return projects.getProjectsByStudent(studentId).stream().map(ProjectMapper::toResponseDto).toList();
    }

    @PostMapping
    public ResponseEntity<ProjectResponseDto> create(JwtAuthenticationToken authentication,
                                                     @Valid @RequestBody ProjectRequestDto request) {
        Long studentId = authenticatedStudents.currentStudent(authentication).getId();
        var project = projects.createProject(studentId, request.getTitle(), request.getDescription(),
                request.getGithubUrl(), request.getLiveDemoUrl(), request.getStartDate(), request.getEndDate());
        var body = ProjectMapper.toResponseDto(project);
        return ResponseEntity.created(URI.create("/api/v1/student/projects/" + body.getId())).body(body);
    }

    @PutMapping("/{id}")
    public ProjectResponseDto update(JwtAuthenticationToken authentication, @PathVariable Long id,
                                     @Valid @RequestBody ProjectRequestDto request) {
        Long studentId = authenticatedStudents.currentStudent(authentication).getId();
        return ProjectMapper.toResponseDto(projects.updateProject(id, studentId, request.getTitle(),
                request.getDescription(), request.getGithubUrl(), request.getLiveDemoUrl(),
                request.getStartDate(), request.getEndDate()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(JwtAuthenticationToken authentication, @PathVariable Long id) {
        projects.deleteProject(id, authenticatedStudents.currentStudent(authentication).getId());
        return ResponseEntity.noContent().build();
    }
}
