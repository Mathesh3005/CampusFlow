package com.campusflow.controller;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.campusflow.dto.dashboard.StudentDashboardResponseDto;
import com.campusflow.entity.Student;
import com.campusflow.service.AuthenticatedStudentService;
import com.campusflow.service.StudentDashboardService;

@RestController
public class StudentDashboardController {

    private final StudentDashboardService dashboardService;
    private final AuthenticatedStudentService authenticatedStudent;

    public StudentDashboardController(
            StudentDashboardService dashboardService,
            AuthenticatedStudentService authenticatedStudent) {
        this.dashboardService = dashboardService;
        this.authenticatedStudent = authenticatedStudent;
    }

    @GetMapping("/api/v1/student/dashboard")
    @PreAuthorize("hasRole('STUDENT')")
    public StudentDashboardResponseDto getDashboard(
            Authentication authentication) {

        if (!(authentication instanceof JwtAuthenticationToken jwt)) {
            throw new AccessDeniedException(
                    "A JWT-authenticated student account is required");
        }

        Student student = authenticatedStudent.currentStudent(jwt);

        return dashboardService.getDashboard(student);
    }
}