package com.campusflow.service;

import com.campusflow.entity.Resume;
import com.campusflow.entity.Student;
import com.campusflow.repository.ResumeRepository;
import com.campusflow.repository.StudentRepository;
import com.campusflow.event.ResumeDeletedEvent;
import com.campusflow.repository.ApplicationRepository;
import com.campusflow.exception.ResumeNotFoundException;
import com.campusflow.exception.ResumeInUseException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.context.ApplicationEventPublisher;

import java.util.List;

@Service
@Transactional
public class ResumeService {

    private static final String PDF_CONTENT_TYPE = "application/pdf";

    private final ResumeRepository resumeRepository;
    private final StudentRepository studentRepository;
    private final ResumeFileStorageService fileStorageService;
    private final ApplicationRepository applicationRepository;
    private final ApplicationEventPublisher eventPublisher;

    public ResumeService(
            ResumeRepository resumeRepository,
            StudentRepository studentRepository,
            ResumeFileStorageService fileStorageService,
            ApplicationRepository applicationRepository,
            ApplicationEventPublisher eventPublisher) {

        this.resumeRepository = resumeRepository;
        this.studentRepository = studentRepository;
        this.fileStorageService = fileStorageService;
        this.applicationRepository = applicationRepository;
        this.eventPublisher = eventPublisher;
    }

    // Upload and save resume
    public Resume createResume(Long studentId, MultipartFile file) {

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResumeNotFoundException("Student not found"));

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Resume file is required");
        }

        String originalFileName = file.getOriginalFilename();

        if (originalFileName == null || originalFileName.isBlank()) {
            originalFileName = "resume.pdf";
        }

        // Remove any directory information from the original filename.
        originalFileName = originalFileName.replace("\\", "/");

        originalFileName = originalFileName.substring(
                originalFileName.lastIndexOf("/") + 1
        );

        String storagePath = null;

        try {

            // Validate and store the actual PDF file.
            storagePath = fileStorageService.store(file);

            Resume resume = new Resume(
                    student,
                    originalFileName,
                    storagePath,
                    file.getSize()
            );

            resume.setIsActive(true);

            // Flush ensures database persistence errors are detected here.
            return resumeRepository.saveAndFlush(resume);

        } catch (RuntimeException exception) {

            // Remove the stored file if database persistence fails.
            if (storagePath != null) {
                try {
                    fileStorageService.delete(storagePath);
                } catch (RuntimeException cleanupException) {
                    exception.addSuppressed(cleanupException);
                }
            }

            throw exception;
        }
    }



    @Transactional(readOnly = true)
    public Resume getResumeById(Long resumeId) {

        return resumeRepository.findById(resumeId)
                .orElseThrow(() -> new ResumeNotFoundException("Resume not found"));
    }

    @Transactional(readOnly = true)
    public Resume getResumeByIdAndStudent(Long resumeId, Long studentId) {
        return resumeRepository.findByIdAndStudentId(resumeId, studentId)
                .orElseThrow(() -> new ResumeNotFoundException("Resume not found"));
    }

    @Transactional(readOnly = true)
    public List<Resume> getResumesByStudent(Long studentId) {

        if (!studentRepository.existsById(studentId)) {
            throw new ResumeNotFoundException("Student not found");
        }

        return resumeRepository.findByStudentId(studentId);
    }

    public Resume activateResume(Long resumeId, Long studentId) {

        Resume resume = resumeRepository
                .findByIdAndStudentId(resumeId, studentId)
                .orElseThrow(() -> new ResumeNotFoundException("Resume not found"));

        resume.setIsActive(true);

        return resumeRepository.save(resume);
    }

    public Resume deactivateResume(Long resumeId, Long studentId) {

        Resume resume = resumeRepository
                .findByIdAndStudentId(resumeId, studentId)
                .orElseThrow(() -> new ResumeNotFoundException("Resume not found"));

        resume.setIsActive(false);

        return resumeRepository.save(resume);
    }

    public void deleteResume(Long resumeId, Long studentId) {

        Resume resume = resumeRepository
                .findByIdAndStudentId(resumeId, studentId)
                .orElseThrow(() -> new ResumeNotFoundException("Resume not found"));

        // Prevent deletion if an application references this resume.
        if (applicationRepository.existsByResume_Id(resumeId)) {
            throw new ResumeInUseException(
                    "Cannot delete a resume that is used in a job application"
            );
        }

        String storagePath = resume.getStoragePath();

        // Delete the database record.
        resumeRepository.delete(resume);

        // Physical file deletion happens after transaction commit.
        eventPublisher.publishEvent(
                new ResumeDeletedEvent(storagePath)
        );
    }
}
