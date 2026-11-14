package com.campusflow.controller;

import com.campusflow.dto.interview.InterviewRequestDto;
import com.campusflow.dto.interview.InterviewResponseDto;
import com.campusflow.dto.interview.InterviewStatusRequestDto;
import com.campusflow.dto.interview.InterviewUpdateRequestDto;
import com.campusflow.dto.common.PageResponseDto;
import com.campusflow.entity.Interview;
import com.campusflow.entity.PlacementOfficer;
import com.campusflow.entity.Student;
import com.campusflow.mapper.InterviewMapper;
import com.campusflow.service.AuthenticatedPlacementOfficerService;
import com.campusflow.service.AuthenticatedStudentService;
import com.campusflow.service.InterviewService;
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
public class InterviewController {
    private final InterviewService interviews;
    private final AuthenticatedStudentService authenticatedStudent;
    private final AuthenticatedPlacementOfficerService authenticatedOfficer;

    public InterviewController(InterviewService interviews,
                               AuthenticatedStudentService authenticatedStudent,
                               AuthenticatedPlacementOfficerService authenticatedOfficer) {
        this.interviews = interviews;
        this.authenticatedStudent = authenticatedStudent;
        this.authenticatedOfficer = authenticatedOfficer;
    }

    @GetMapping("/api/v1/student/interviews")
    @PreAuthorize("hasRole('STUDENT')")
    public PageResponseDto<InterviewResponseDto> studentInterviews(Authentication authentication,
            @PageableDefault(size = 20, sort = "scheduledAt", direction = Sort.Direction.ASC) Pageable pageable) {
        Student student = currentStudent(authentication);
        return PageResponseDto.from(interviews.getInterviewsForStudent(student.getId(), pageable)
                .map(InterviewMapper::toResponseDto));
    }

    @GetMapping("/api/v1/student/interviews/{id}")
    @PreAuthorize("hasRole('STUDENT')")
    public InterviewResponseDto studentInterview(Authentication authentication, @PathVariable Long id) {
        Student student = currentStudent(authentication);
        return InterviewMapper.toResponseDto(interviews.getInterviewForStudent(id, student.getId()));
    }

    @PostMapping("/api/v1/officer/interviews")
    @PreAuthorize("hasRole('PLACEMENT_OFFICER')")
    public ResponseEntity<InterviewResponseDto> create(Authentication authentication,
                                                       @Valid @RequestBody InterviewRequestDto request) {
        PlacementOfficer officer = currentOfficer(authentication);
        Interview interview = interviews.scheduleForOfficer(request.getApplicationId(), officer.getUser().getId(),
                request.getScheduledAt(), request.getInterviewMode(), request.getLocationOrLink(), request.getNotes());
        InterviewResponseDto response = InterviewMapper.toResponseDto(interview);
        return ResponseEntity.created(URI.create("/api/v1/officer/interviews/" + response.getId())).body(response);
    }

    @GetMapping("/api/v1/officer/interviews")
    @PreAuthorize("hasRole('PLACEMENT_OFFICER')")
    public PageResponseDto<InterviewResponseDto> officerInterviews(Authentication authentication,
            @PageableDefault(size = 20, sort = "scheduledAt", direction = Sort.Direction.ASC) Pageable pageable) {
        PlacementOfficer officer = currentOfficer(authentication);
        return PageResponseDto.from(interviews.getInterviewsForOfficer(officer.getUser().getId(), pageable)
                .map(InterviewMapper::toResponseDto));
    }

    @GetMapping("/api/v1/officer/interviews/{id}")
    @PreAuthorize("hasRole('PLACEMENT_OFFICER')")
    public InterviewResponseDto officerInterview(Authentication authentication, @PathVariable Long id) {
        PlacementOfficer officer = currentOfficer(authentication);
        return InterviewMapper.toResponseDto(interviews.getInterviewForOfficer(id, officer.getUser().getId()));
    }

    @PutMapping("/api/v1/officer/interviews/{id}")
    @PreAuthorize("hasRole('PLACEMENT_OFFICER')")
    public InterviewResponseDto update(Authentication authentication, @PathVariable Long id,
                                       @Valid @RequestBody InterviewUpdateRequestDto request) {
        PlacementOfficer officer = currentOfficer(authentication);
        return InterviewMapper.toResponseDto(interviews.updateForOfficer(id, officer.getUser().getId(),
                request.getScheduledAt(), request.getInterviewMode(), request.getLocationOrLink(), request.getNotes()));
    }

    @PatchMapping("/api/v1/officer/interviews/{id}/status")
    @PreAuthorize("hasRole('PLACEMENT_OFFICER')")
    public InterviewResponseDto updateStatus(Authentication authentication, @PathVariable Long id,
                                             @Valid @RequestBody InterviewStatusRequestDto request) {
        PlacementOfficer officer = currentOfficer(authentication);
        return InterviewMapper.toResponseDto(
                interviews.updateStatusForOfficer(id, officer.getUser().getId(), request.getStatus()));
    }

    @DeleteMapping("/api/v1/officer/interviews/{id}")
    @PreAuthorize("hasRole('PLACEMENT_OFFICER')")
    public ResponseEntity<Void> delete(Authentication authentication, @PathVariable Long id) {
        PlacementOfficer officer = currentOfficer(authentication);
        interviews.deleteForOfficer(id, officer.getUser().getId());
        return ResponseEntity.noContent().build();
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
