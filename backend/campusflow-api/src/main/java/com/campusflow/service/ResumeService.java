package com.campusflow.service;

import com.campusflow.entity.Resume;
import com.campusflow.entity.Student;
import com.campusflow.repository.ResumeRepository;
import com.campusflow.repository.StudentRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class ResumeService {

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;
    private static final String PDF_CONTENT_TYPE = "application/pdf";

    private final ResumeRepository resumeRepository;
    private final StudentRepository studentRepository;

    public ResumeService(
            ResumeRepository resumeRepository,
            StudentRepository studentRepository) {

        this.resumeRepository = resumeRepository;
        this.studentRepository = studentRepository;
    }

    public Resume createResume(
            Long studentId,
            String fileName,
            String storagePath,
            Long fileSize,
            String contentType) {

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        if (fileName == null || fileName.isBlank()) {
            throw new IllegalArgumentException("File name is required");
        }

        if (storagePath == null || storagePath.isBlank()) {
            throw new IllegalArgumentException("Storage path is required");
        }

        if (fileSize == null || fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
            throw new IllegalArgumentException(
                    "Resume size must be between 1 byte and 5 MB");
        }

        if (!PDF_CONTENT_TYPE.equalsIgnoreCase(contentType)) {
            throw new IllegalArgumentException("Only PDF files are allowed");
        }

        Resume resume = new Resume(
                student,
                fileName,
                storagePath,
                fileSize
        );

        return resumeRepository.save(resume);
    }

    @Transactional(readOnly = true)
    public Resume getResumeById(Long resumeId) {
        return resumeRepository.findById(resumeId)
                .orElseThrow(() -> new RuntimeException("Resume not found"));
    }

    @Transactional(readOnly = true)
    public List<Resume> getResumesByStudent(Long studentId) {

        if (!studentRepository.existsById(studentId)) {
            throw new RuntimeException("Student not found");
        }

        return resumeRepository.findByStudentId(studentId);
    }

    public Resume activateResume(Long resumeId, Long studentId) {

        Resume resume = resumeRepository
                .findByIdAndStudentId(resumeId, studentId)
                .orElseThrow(() -> new RuntimeException(
                        "Resume not found or does not belong to this student"));

        resume.setIsActive(true);

        return resumeRepository.save(resume);
    }

    public Resume deactivateResume(Long resumeId, Long studentId) {

        Resume resume = resumeRepository
                .findByIdAndStudentId(resumeId, studentId)
                .orElseThrow(() -> new RuntimeException(
                        "Resume not found or does not belong to this student"));

        resume.setIsActive(false);

        return resumeRepository.save(resume);
    }

    public void deleteResume(Long resumeId, Long studentId) {

        Resume resume = resumeRepository
                .findByIdAndStudentId(resumeId, studentId)
                .orElseThrow(() -> new RuntimeException(
                        "Resume not found or does not belong to this student"));

        resumeRepository.delete(resume);
    }
}