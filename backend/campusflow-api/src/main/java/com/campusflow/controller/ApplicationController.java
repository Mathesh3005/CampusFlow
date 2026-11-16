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
import com.campusflow.service.ResumeFileStorageService;
import com.campusflow.exception.ResumeNotFoundException;
import com.campusflow.service.AuthenticatedPlacementOfficerService;
import com.campusflow.service.AuthenticatedStudentService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ContentDisposition;
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
    private final ResumeFileStorageService resumeFiles;

    public ApplicationController(ApplicationService applications,
                                 AuthenticatedStudentService authenticatedStudent,
                                 AuthenticatedPlacementOfficerService authenticatedOfficer,
                                 ResumeFileStorageService resumeFiles) {
        this.applications = applications;
        this.authenticatedStudent = authenticatedStudent;
        this.authenticatedOfficer = authenticatedOfficer;
        this.resumeFiles = resumeFiles;
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
    public PageResponseDto<ApplicationResponseDto> officerApplications(
            Authentication authentication,
            @RequestParam(required = false) Long jobId,
            @RequestParam(required = false) com.campusflow.entity.ApplicationStatus status,
            @RequestParam(required = false) Long studentId,
            @PageableDefault(size = 20, sort = "appliedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        validateApplicationSort(pageable);
        PlacementOfficer officer = currentOfficer(authentication);
        return PageResponseDto.from(applications.getApplicationsForOfficer(
                officer.getUser().getId(), jobId, status, studentId, pageable)
                .map(ApplicationMapper::toResponseDto));
    }

    @GetMapping("/api/v1/officer/applications/{id}")
    @PreAuthorize("hasRole('PLACEMENT_OFFICER')")
    public ApplicationResponseDto officerApplication(Authentication authentication, @PathVariable Long id) {
        PlacementOfficer officer = currentOfficer(authentication);
        return ApplicationMapper.toResponseDto(applications.getApplicationForOfficer(id, officer.getUser().getId()));
    }

    @GetMapping("/api/v1/officer/applications/{id}/resume")
    @PreAuthorize("hasRole('PLACEMENT_OFFICER')")
    public ResponseEntity<byte[]> downloadApplicantResume(Authentication authentication, @PathVariable Long id) {
        PlacementOfficer officer = currentOfficer(authentication);
        Application application = applications.getApplicationForOfficer(id, officer.getUser().getId());
        if (application.getResume() == null) {
            throw new ResumeNotFoundException("This application has no attached resume");
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(ContentDisposition.attachment()
                .filename(application.getResume().getFileName()).build());
        headers.setCacheControl("private, no-store");
        return ResponseEntity.ok().headers(headers)
                .body(resumeFiles.read(application.getResume().getStoragePath()));
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

    private static void validateApplicationSort(Pageable pageable) {
        java.util.Set<String> sortable = java.util.Set.of("id", "status", "appliedAt", "updatedAt");
        for (Sort.Order order : pageable.getSort()) {
            if (!sortable.contains(order.getProperty())) {
                throw new IllegalArgumentException("Unsupported application sort field: " + order.getProperty());
            }
        }
    }
}
