package com.campusflow.service;

import com.campusflow.entity.*;
import com.campusflow.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.math.BigDecimal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import com.campusflow.exception.ApplicationConflictException;
import com.campusflow.exception.ApplicationNotFoundException;
import com.campusflow.exception.InvalidApplicationTransitionException;
import com.campusflow.exception.JobNotFoundException;
import com.campusflow.exception.ResumeNotFoundException;

@Service
@Transactional
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final StudentRepository studentRepository;
    private final JobRepository jobRepository;
    private final ResumeRepository resumeRepository;
    private final NotificationService notificationService;
    private static final Map<ApplicationStatus, Set<ApplicationStatus>> OFFICER_TRANSITIONS = Map.of(
            ApplicationStatus.APPLIED, Set.of(ApplicationStatus.UNDER_REVIEW, ApplicationStatus.REJECTED),
            ApplicationStatus.UNDER_REVIEW, Set.of(ApplicationStatus.SHORTLISTED, ApplicationStatus.REJECTED),
            ApplicationStatus.SHORTLISTED, Set.of(ApplicationStatus.SELECTED, ApplicationStatus.REJECTED)
    );

    public ApplicationService(
            ApplicationRepository applicationRepository,
            StudentRepository studentRepository,
            JobRepository jobRepository,
            ResumeRepository resumeRepository,
            NotificationService notificationService) {
        this.applicationRepository = applicationRepository;
        this.studentRepository = studentRepository;
        this.jobRepository = jobRepository;
        this.resumeRepository = resumeRepository;
        this.notificationService = notificationService;
    }

    public Application applyForJob(
            Long studentId,
            Long jobId,
            Long resumeId,
            String coverLetter) {

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new AccessDeniedException("No student profile for authenticated user"));

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new JobNotFoundException(jobId));

        if (job.getStatus() != JobStatus.PUBLISHED) {
            throw new ApplicationConflictException("This job is not open for applications");
        }

        if (job.getApplicationDeadline() == null ||
                !job.getApplicationDeadline().isAfter(OffsetDateTime.now())) {
            throw new ApplicationConflictException("Application deadline has passed");
        }

        if (applicationRepository.existsByStudentIdAndJobId(studentId, jobId)) {
            throw new ApplicationConflictException("You have already applied for this job");
        }

        if (job.getMinimumCgpa() != null &&
                (student.getCgpa() == null ||
                        student.getCgpa().compareTo(job.getMinimumCgpa()) < 0)) {
            throw new AccessDeniedException("You do not meet the minimum CGPA requirement");
        }

        Application application = new Application(student, job, coverLetter);

        if (resumeId != null) {
            Resume resume = resumeRepository
                    .findByIdAndStudentId(resumeId, studentId)
                    .orElseThrow(() -> new ResumeNotFoundException(
                            "Resume not found or does not belong to this student"));

            application.setResume(resume);
        }

        try {
            Application saved = applicationRepository.saveAndFlush(application);
            notificationService.applicationSubmitted(saved);
            return saved;
        } catch (DataIntegrityViolationException ex) {
            // The V1 unique constraint is the final guard for concurrent duplicate submissions.
            throw new ApplicationConflictException("You have already applied for this job");
        }
    }

    @Transactional(readOnly = true)
    public Application getApplicationById(Long applicationId) {
        return applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ApplicationNotFoundException(applicationId));
    }

    @Transactional(readOnly = true)
    public List<Application> getApplicationsByStudent(Long studentId) {
        return applicationRepository.findByStudentId(studentId);
    }

    @Transactional(readOnly = true)
    public Page<Application> getApplicationsByStudent(Long studentId, Pageable pageable) {
        return applicationRepository.findByStudentId(studentId, pageable);
    }

    @Transactional(readOnly = true)
    public Application getApplicationByIdAndStudent(Long applicationId, Long studentId) {
        return applicationRepository.findByIdAndStudentId(applicationId, studentId)
                .orElseThrow(() -> new ApplicationNotFoundException(applicationId));
    }

    @Transactional(readOnly = true)
    public Page<Application> getApplicationsForOfficer(Long officerUserId, Pageable pageable) {
        return applicationRepository.findByJob_CreatedBy_User_Id(officerUserId, pageable);
    }

    @Transactional(readOnly = true)
    public Application getApplicationForOfficer(Long applicationId, Long officerUserId) {
        return applicationRepository.findByIdAndJob_CreatedBy_User_Id(applicationId, officerUserId)
                .orElseThrow(() -> new ApplicationNotFoundException(applicationId));
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

        validateOfficerTransition(application.getStatus(), newStatus);
        application.setStatus(newStatus);

        Application saved = applicationRepository.save(application);
        notificationService.applicationStatusChanged(saved);
        return saved;
    }

    public Application withdrawApplication(Long applicationId, Long studentId) {

        Application application = getApplicationByIdAndStudent(applicationId, studentId);

        ApplicationStatus currentStatus = application.getStatus();

        if (currentStatus == ApplicationStatus.SELECTED ||
                currentStatus == ApplicationStatus.REJECTED ||
                currentStatus == ApplicationStatus.WITHDRAWN) {
            throw new InvalidApplicationTransitionException("This application cannot be withdrawn");
        }

        application.setStatus(ApplicationStatus.WITHDRAWN);

        return applicationRepository.save(application);
    }

    public Application updateApplicationStatusForOfficer(Long applicationId, Long officerUserId,
                                                           ApplicationStatus newStatus) {
        Application application = applicationRepository.findByIdAndJob_CreatedBy_User_Id(applicationId, officerUserId)
                .orElseThrow(() -> new ApplicationNotFoundException(applicationId));
        validateOfficerTransition(application.getStatus(), newStatus);
        application.setStatus(newStatus);
        Application saved = applicationRepository.save(application);
        notificationService.applicationStatusChanged(saved);
        return saved;
    }

    private static void validateOfficerTransition(ApplicationStatus current, ApplicationStatus next) {
        if (next == null || !OFFICER_TRANSITIONS.getOrDefault(current, Set.of()).contains(next)) {
            throw new InvalidApplicationTransitionException(
                    "Application status cannot transition from " + current + " to " + next);
        }
    }
}
