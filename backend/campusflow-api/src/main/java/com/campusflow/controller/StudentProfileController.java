package com.campusflow.controller;

import com.campusflow.dto.student.StudentProfileUpdateRequest;
import com.campusflow.dto.student.StudentResponseDto;
import com.campusflow.entity.Student;
import com.campusflow.mapper.StudentMapper;
import com.campusflow.service.AuthenticatedStudentService;
import com.campusflow.service.StudentService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/student/profile")
@PreAuthorize("hasRole('STUDENT')")
public class StudentProfileController {
    private final AuthenticatedStudentService authenticatedStudents;
    private final StudentService students;

    public StudentProfileController(AuthenticatedStudentService authenticatedStudents,
                                    StudentService students) {
        this.authenticatedStudents = authenticatedStudents;
        this.students = students;
    }

    @GetMapping
    public StudentResponseDto getProfile(JwtAuthenticationToken authentication) {
        return StudentMapper.toResponseDto(authenticatedStudents.currentStudent(authentication));
    }

    @PutMapping
    public StudentResponseDto updateProfile(JwtAuthenticationToken authentication,
                                            @Valid @RequestBody StudentProfileUpdateRequest request) {
        Student student = authenticatedStudents.currentStudent(authentication);
        return StudentMapper.toResponseDto(students.updateProfile(student, request));
    }
}
