package com.campusflow.service;

import com.campusflow.entity.*;
import com.campusflow.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;

@Service
@Transactional
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final StudentRepository studentRepository;
    private final JobRepository jobRepository;
    private final ResumeRepository resumeRepository;

    public ApplicationService(
            ApplicationRepository applicationRepository,
            StudentRepository studentRepository,
            JobRepository jobRepository,
            ResumeRepository resumeRepository) {
        this.applicationRepository = applicationRepository;
        this.studentRepository = studentRepository;
        this.jobRepository = jobRepository;
        this.resumeRepository = resumeRepository;
    }

    public Application applyForJob(
            Long studentId,
            Long jobId,
            Long resumeId,
            String coverLetter) {

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found"));

        if (job.getStatus() != JobStatus.PUBLISHED) {
            throw new RuntimeException("This job is not open for applications");
        }

        if (job.getApplicationDeadline() == null ||
                !job.getApplicationDeadline().isAfter(OffsetDateTime.now())) {
            throw new RuntimeException("Application deadline has passed");
        }

        if (applicationRepository.existsByStudentIdAndJobId(studentId, jobId)) {
            throw new RuntimeException("You have already applied for this job");
        }

        if (job.getMinimumCgpa() != null &&
                (student.getCgpa() == null ||
                        student.getCgpa().compareTo(job.getMinimumCgpa()) < 0)) {
            throw new RuntimeException("You do not meet the minimum CGPA requirement");
        }

        Application application = new Application(student, job, coverLetter);

        if (resumeId != null) {
            Resume resume = resumeRepository
                    .findByIdAndStudentId(resumeId, studentId)
                    .orElseThrow(() -> new RuntimeException(
                            "Resume not found or does not belong to this student"));

            application.setResume(resume);
        }

        return applicationRepository.save(application);
    }

    @Transactional(readOnly = true)
    public Application getApplicationById(Long applicationId) {
        return applicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found"));
    }

    @Transactional(readOnly = true)
    public List<Application> getApplicationsByStudent(Long studentId) {
        return applicationRepository.findByStudentId(studentId);
    }

    @Transactional(readOnly = true)
    public List<Application> getApplicationsByJob(Long jobId) {
        return applicationRepository.findByJobId(jobId);
    }

    @Transactional(readOnly = true)
    public List<Application> getApplicationsByStatus(ApplicationStatus status) {
        return applicationRepository.findByStatus(status);
    }

    public Application updateApplicationStatus(
            Long applicationId,
            ApplicationStatus newStatus) {

        Application application = getApplicationById(applicationId);

        if (newStatus == null) {
            throw new IllegalArgumentException("Application status cannot be null");
        }

        application.setStatus(newStatus);

        return applicationRepository.save(application);
    }

    public Application withdrawApplication(Long applicationId, Long studentId) {

        Application application = getApplicationById(applicationId);

        if (!application.getStudent().getId().equals(studentId)) {
            throw new RuntimeException("You cannot withdraw another student's application");
        }

        ApplicationStatus currentStatus = application.getStatus();

        if (currentStatus == ApplicationStatus.SELECTED ||
                currentStatus == ApplicationStatus.REJECTED ||
                currentStatus == ApplicationStatus.WITHDRAWN) {
            throw new RuntimeException("This application cannot be withdrawn");
        }

        application.setStatus(ApplicationStatus.WITHDRAWN);

        return applicationRepository.save(application);
    }
}