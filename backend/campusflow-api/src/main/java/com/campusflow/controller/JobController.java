package com.campusflow.controller;

import com.campusflow.dto.job.JobRequestDto;
import com.campusflow.dto.job.JobResponseDto;
import com.campusflow.dto.common.PageResponseDto;
import com.campusflow.entity.Job;
import com.campusflow.entity.PlacementOfficer;
import com.campusflow.entity.Student;
import com.campusflow.mapper.JobMapper;
import com.campusflow.repository.StudentRepository;
import com.campusflow.service.AuthenticatedPlacementOfficerService;
import com.campusflow.service.JobService;
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

import java.math.BigDecimal;
import java.net.URI;
import java.util.Set;

@RestController
public class JobController {
    private static final Set<String> SORTABLE_FIELDS = Set.of(
            "companyName", "jobTitle", "location", "applicationDeadline", "createdAt", "updatedAt");

    private final JobService jobs;
    private final AuthenticatedPlacementOfficerService authenticatedOfficer;
    private final StudentRepository students;

    public JobController(JobService jobs, AuthenticatedPlacementOfficerService authenticatedOfficer,
                         StudentRepository students) {
        this.jobs = jobs;
        this.authenticatedOfficer = authenticatedOfficer;
        this.students = students;
    }

    @PostMapping("/api/v1/officer/jobs")
    @PreAuthorize("hasRole('PLACEMENT_OFFICER')")
    public ResponseEntity<JobResponseDto> create(Authentication authentication, @Valid @RequestBody JobRequestDto request) {
        PlacementOfficer officer = currentOfficer(authentication);
        Job input = toJob(request);
        Job created = jobs.createJobForOfficer(officer.getUser().getId(), input, request.getLocation(),
                request.getMinimumCgpa(), request.getSalaryMin(), request.getSalaryMax());
        JobResponseDto response = JobMapper.toResponseDto(created);
        return ResponseEntity.created(URI.create("/api/v1/officer/jobs/" + response.getId())).body(response);
    }

    @GetMapping("/api/v1/officer/jobs")
    @PreAuthorize("hasRole('PLACEMENT_OFFICER')")
    public PageResponseDto<JobResponseDto> officerJobs(Authentication authentication,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        validateSort(pageable);
        PlacementOfficer officer = currentOfficer(authentication);
        return PageResponseDto.from(jobs.getOfficerJobs(officer.getUser().getId(), pageable)
                .map(JobMapper::toResponseDto));
    }

    @GetMapping("/api/v1/officer/jobs/{id}")
    @PreAuthorize("hasRole('PLACEMENT_OFFICER')")
    public JobResponseDto officerJob(Authentication authentication, @PathVariable Long id) {
        return JobMapper.toResponseDto(jobs.getOfficerJob(currentOfficer(authentication).getId(), id));
    }

    @PutMapping("/api/v1/officer/jobs/{id}")
    @PreAuthorize("hasRole('PLACEMENT_OFFICER')")
    public JobResponseDto update(Authentication authentication, @PathVariable Long id,
                                 @Valid @RequestBody JobRequestDto request) {
        Job updated = jobs.updateJobForOfficer(currentOfficer(authentication).getId(), id, toJob(request));
        return JobMapper.toResponseDto(updated);
    }

    @PatchMapping("/api/v1/officer/jobs/{id}/publish")
    @PreAuthorize("hasRole('PLACEMENT_OFFICER')")
    public JobResponseDto publish(Authentication authentication, @PathVariable Long id) {
        return JobMapper.toResponseDto(jobs.publishJobForOfficer(currentOfficer(authentication).getId(), id));
    }

    @PatchMapping("/api/v1/officer/jobs/{id}/close")
    @PreAuthorize("hasRole('PLACEMENT_OFFICER')")
    public JobResponseDto close(Authentication authentication, @PathVariable Long id) {
        return JobMapper.toResponseDto(jobs.closeJobForOfficer(currentOfficer(authentication).getId(), id));
    }

    @DeleteMapping("/api/v1/officer/jobs/{id}")
    @PreAuthorize("hasRole('PLACEMENT_OFFICER')")
    public ResponseEntity<Void> delete(Authentication authentication, @PathVariable Long id) {
        jobs.deleteJobForOfficer(currentOfficer(authentication).getId(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/v1/student/jobs")
    @PreAuthorize("hasRole('STUDENT')")
    public PageResponseDto<JobResponseDto> studentJobs(Authentication authentication,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) com.campusflow.entity.EmploymentType employmentType,
            @RequestParam(required = false) com.campusflow.entity.WorkMode workMode,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        validateSort(pageable);
        Student student = currentStudent(authentication);
        return PageResponseDto.from(jobs.searchPublishedJobs(location, employmentType, workMode, student.getCgpa(), pageable)
                .map(JobMapper::toResponseDto));
    }

    @GetMapping("/api/v1/student/jobs/{id}")
    @PreAuthorize("hasRole('STUDENT')")
    public JobResponseDto studentJob(Authentication authentication, @PathVariable Long id) {
        return JobMapper.toResponseDto(jobs.getPublishedJob(id, currentStudent(authentication).getCgpa()));
    }

    private PlacementOfficer currentOfficer(Authentication authentication) {
        if (!(authentication instanceof JwtAuthenticationToken jwt)) {
            throw new AccessDeniedException("A JWT-authenticated placement officer account is required");
        }
        return authenticatedOfficer.currentOfficer(jwt);
    }

    private Student currentStudent(Authentication authentication) {
        if (!(authentication instanceof JwtAuthenticationToken jwt)) {
            throw new AccessDeniedException("A JWT-authenticated student account is required");
        }
        try {
            return students.findByUserId(Long.valueOf(jwt.getToken().getSubject()))
                    .orElseThrow(() -> new AccessDeniedException("No student profile for authenticated user"));
        } catch (NumberFormatException ex) {
            throw new AccessDeniedException("Invalid authenticated user");
        }
    }

    private static Job toJob(JobRequestDto request) {
        Job job = new Job(null, request.getCompanyName().trim(), request.getJobTitle().trim(),
                request.getJobDescription().trim(), request.getEmploymentType(), request.getWorkMode(),
                request.getApplicationDeadline());
        job.setLocation(request.getLocation() == null ? null : request.getLocation().trim());
        job.setMinimumCgpa(request.getMinimumCgpa());
        job.setSalaryMin(request.getSalaryMin());
        job.setSalaryMax(request.getSalaryMax());
        return job;
    }

    private static void validateSort(Pageable pageable) {
        for (Sort.Order order : pageable.getSort()) {
            if (!SORTABLE_FIELDS.contains(order.getProperty())) {
                throw new IllegalArgumentException("Unsupported job sort field: " + order.getProperty());
            }
        }
    }
}
