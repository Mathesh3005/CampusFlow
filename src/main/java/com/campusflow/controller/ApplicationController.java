package com.campusflow.controller;

import com.campusflow.dto.application.ApplicationRequestDto;
import com.campusflow.dto.application.ApplicationResponseDto;
import com.campusflow.dto.application.ApplicationStatusRequestDto;
import com.campusflow.dto.common.PageResponseDto;
import com.campusflow.entity.Application;
import com.campusflow.entity.PlacementOfficer;
import com.campusflow.entity.Student;
import com.campusflow.mapper.ApplicationMapper;
import com.campusflow.service.ApplicationService;
import com.campusflow.service.AuthenticatedPlacementOfficerService;
import com.campusflow.service.AuthenticatedStudentService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@RestController
public class ApplicationController {
    private final ApplicationService applications;
    private final AuthenticatedStudentService authenticatedStudent;
    private final AuthenticatedPlacementOfficerService authenticatedOfficer;

    public ApplicationController(ApplicationService applications,
                                 AuthenticatedStudentService authenticatedStudent,
                                 AuthenticatedPlacementOfficerService authenticatedOfficer) {
        this.applications = applications;
        this.authenticatedStudent = authenticatedStudent;
        this.authenticatedOfficer = authenticatedOfficer;
    }

    @PostMapping("/api/v1/student/applications")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApplicationResponseDto> apply(Authentication authentication,
                                                        @Valid @RequestBody ApplicationRequestDto request) {
        Student student = currentStudent(authentication);
        Application created = applications.applyForJob(student.getId(), request.getJobId(),
                request.getResumeId(), request.getCoverLetter());
        ApplicationResponseDto response = ApplicationMapper.toResponseDto(created);
        return ResponseEntity.created(URI.create("/api/v1/student/applications/" + response.getId())).body(response);
    }

    @GetMapping("/api/v1/student/applications")
    @PreAuthorize("hasRole('STUDENT')")
    public PageResponseDto<ApplicationResponseDto> studentApplications(Authentication authentication,
            @PageableDefault(size = 20, sort = "appliedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return PageResponseDto.from(applications.getApplicationsByStudent(currentStudent(authentication).getId(), pageable)
                .map(ApplicationMapper::toResponseDto));
    }

    @GetMapping("/api/v1/student/applications/{id}")
    @PreAuthorize("hasRole('STUDENT')")
    public ApplicationResponseDto studentApplication(Authentication authentication, @PathVariable Long id) {
        return ApplicationMapper.toResponseDto(
                applications.getApplicationByIdAndStudent(id, currentStudent(authentication).getId()));
    }

    @PatchMapping("/api/v1/student/applications/{id}/withdraw")
    @PreAuthorize("hasRole('STUDENT')")
    public ApplicationResponseDto withdraw(Authentication authentication, @PathVariable Long id) {
        return ApplicationMapper.toResponseDto(
                applications.withdrawApplication(id, currentStudent(authentication).getId()));
    }

    @GetMapping("/api/v1/officer/applications")
    @PreAuthorize("hasRole('PLACEMENT_OFFICER')")
    public PageResponseDto<ApplicationResponseDto> officerApplications(Authentication authentication,
            @PageableDefault(size = 20, sort = "appliedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        PlacementOfficer officer = currentOfficer(authentication);
        return PageResponseDto.from(applications.getApplicationsForOfficer(officer.getUser().getId(), pageable)
                .map(ApplicationMapper::toResponseDto));
    }

    @GetMapping("/api/v1/officer/applications/{id}")
    @PreAuthorize("hasRole('PLACEMENT_OFFICER')")
    public ApplicationResponseDto officerApplication(Authentication authentication, @PathVariable Long id) {
        PlacementOfficer officer = currentOfficer(authentication);
        return ApplicationMapper.toResponseDto(applications.getApplicationForOfficer(id, officer.getUser().getId()));
    }

    @PatchMapping("/api/v1/officer/applications/{id}/status")
    @PreAuthorize("hasRole('PLACEMENT_OFFICER')")
    public ApplicationResponseDto updateStatus(Authentication authentication, @PathVariable Long id,
                                               @Valid @RequestBody ApplicationStatusRequestDto request) {
        PlacementOfficer officer = currentOfficer(authentication);
        return ApplicationMapper.toResponseDto(applications.updateApplicationStatusForOfficer(
                id, officer.getUser().getId(), request.getStatus()));
    }

    private Student currentStudent(Authentication authentication) {
        if (!(authentication instanceof JwtAuthenticationToken jwt)) {
            throw new AccessDeniedException("A JWT-authenticated student account is required");
        }
        return authenticatedStudent.currentStudent(jwt);
    }

    private PlacementOfficer currentOfficer(Authentication authentication) {
        if (!(authentication instanceof JwtAuthenticationToken jwt)) {
            throw new AccessDeniedException("A JWT-authenticated placement officer account is required");
        }
        return authenticatedOfficer.currentOfficer(jwt);
    }
}
