package com.campusflow.controller;

import com.campusflow.dto.studentskill.StudentSkillRequestDto;
import com.campusflow.dto.studentskill.StudentSkillResponseDto;
import com.campusflow.entity.StudentSkill;
import com.campusflow.service.AuthenticatedStudentService;
import com.campusflow.service.SkillService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/student/skills")
@PreAuthorize("hasRole('STUDENT')")
public class StudentSkillController {
    private final AuthenticatedStudentService authenticatedStudents;
    private final SkillService skills;

    public StudentSkillController(AuthenticatedStudentService authenticatedStudents, SkillService skills) {
        this.authenticatedStudents = authenticatedStudents;
        this.skills = skills;
    }

    @GetMapping
    public List<StudentSkillResponseDto> list(JwtAuthenticationToken authentication) {
        Long studentId = authenticatedStudents.currentStudent(authentication).getId();
        return skills.getStudentSkills(studentId).stream().map(StudentSkillController::toResponse).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StudentSkillResponseDto add(JwtAuthenticationToken authentication,
                                       @Valid @RequestBody StudentSkillRequestDto request) {
        Long studentId = authenticatedStudents.currentStudent(authentication).getId();
        return toResponse(skills.addSkillToStudent(studentId, request.getSkillId(), request.getProficiencyLevel()));
    }

    @PutMapping("/{skillId}")
    public StudentSkillResponseDto update(JwtAuthenticationToken authentication, @PathVariable Long skillId,
                                          @Valid @RequestBody StudentSkillRequestDto request) {
        Long studentId = authenticatedStudents.currentStudent(authentication).getId();
        if (!skillId.equals(request.getSkillId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The skill ID in the path must match the request");
        }
        return toResponse(skills.updateStudentSkillProficiency(studentId, skillId, request.getProficiencyLevel()));
    }

    @DeleteMapping("/{skillId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(JwtAuthenticationToken authentication, @PathVariable Long skillId) {
        skills.removeSkillFromStudent(authenticatedStudents.currentStudent(authentication).getId(), skillId);
    }

    private static StudentSkillResponseDto toResponse(StudentSkill studentSkill) {
        StudentSkillResponseDto response = new StudentSkillResponseDto();
        response.setSkillId(studentSkill.getSkill().getId());
        response.setSkillName(studentSkill.getSkill().getName());
        response.setProficiencyLevel(studentSkill.getProficiencyLevel());
        response.setCreatedAt(studentSkill.getCreatedAt());
        return response;
    }
}
