package com.campusflow.controller;

import com.campusflow.config.ResumeStorageProperties;
import com.campusflow.dto.resume.ResumeResponseDto;
import com.campusflow.entity.Resume;
import com.campusflow.entity.Student;
import com.campusflow.mapper.ResumeMapper;
import com.campusflow.service.AuthenticatedStudentService;
import com.campusflow.service.ResumeService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/student/resumes")
@PreAuthorize("hasRole('STUDENT')")
public class ResumeController {
    private final ResumeService resumeService;
    private final AuthenticatedStudentService authenticatedStudentService;
    private final ResumeStorageProperties storageProperties;

    public ResumeController(ResumeService resumeService,
                            AuthenticatedStudentService authenticatedStudentService,
                            ResumeStorageProperties storageProperties) {
        this.resumeService = resumeService;
        this.authenticatedStudentService = authenticatedStudentService;
        this.storageProperties = storageProperties;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ResumeResponseDto> upload(Authentication authentication,
                                                     @RequestPart("file") MultipartFile file) {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Resume file is required");
        if (!MediaType.APPLICATION_PDF_VALUE.equalsIgnoreCase(file.getContentType()))
            throw new IllegalArgumentException("Only PDF files are allowed");
        if (file.getSize() > storageProperties.getMaxSize())
            throw new org.springframework.web.multipart.MaxUploadSizeExceededException(storageProperties.getMaxSize());

        Student student = currentStudent(authentication);
        Resume saved = resumeService.createResume(student.getId(), file);
        ResumeResponseDto body = ResumeMapper.toResponseDto(saved);
        URI location = URI.create("/api/v1/student/resumes/" + body.getId());
        return ResponseEntity.created(location).body(body);
    }

    @GetMapping
    public List<ResumeResponseDto> list(Authentication authentication) {
        Long studentId = currentStudent(authentication).getId();
        return resumeService.getResumesByStudent(studentId).stream().map(ResumeMapper::toResponseDto).toList();
    }

    @GetMapping("/{id}")
    public ResumeResponseDto get(Authentication authentication, @PathVariable Long id) {
        Long studentId = currentStudent(authentication).getId();
        return ResumeMapper.toResponseDto(resumeService.getResumeByIdAndStudent(id, studentId));
    }

    @PatchMapping("/{id}/activate")
    public ResumeResponseDto activate(Authentication authentication, @PathVariable Long id) {
        return ResumeMapper.toResponseDto(resumeService.activateResume(id, currentStudent(authentication).getId()));
    }

    @PatchMapping("/{id}/deactivate")
    public ResumeResponseDto deactivate(Authentication authentication, @PathVariable Long id) {
        return ResumeMapper.toResponseDto(resumeService.deactivateResume(id, currentStudent(authentication).getId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(Authentication authentication, @PathVariable Long id) {
        resumeService.deleteResume(id, currentStudent(authentication).getId());
        return ResponseEntity.noContent().build();
    }

    private Student currentStudent(Authentication authentication) {
        if (!(authentication instanceof JwtAuthenticationToken jwtAuthentication))
            throw new AccessDeniedException("A JWT-authenticated student account is required");
        return authenticatedStudentService.currentStudent(jwtAuthentication);
    }
}
