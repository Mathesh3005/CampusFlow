package com.campusflow.service;

import com.campusflow.entity.Job;
import com.campusflow.entity.JobStatus;
import com.campusflow.entity.PlacementOfficer;
import com.campusflow.repository.JobRepository;
import com.campusflow.repository.PlacementOfficerRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.math.BigDecimal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.campusflow.entity.EmploymentType;
import com.campusflow.entity.WorkMode;
import com.campusflow.exception.JobNotFoundException;
import org.springframework.security.access.AccessDeniedException;

@Service
@Transactional
public class JobService {

    private final JobRepository jobRepository;
    private final PlacementOfficerRepository placementOfficerRepository;
    private final NotificationService notificationService;

    public JobService(
            JobRepository jobRepository,
            PlacementOfficerRepository placementOfficerRepository,
            NotificationService notificationService) {
        this.jobRepository = jobRepository;
        this.placementOfficerRepository = placementOfficerRepository;
        this.notificationService = notificationService;
    }

    public Job createJob(Job job) {

        if (job == null) {
            throw new IllegalArgumentException("Job cannot be null");
        }

        if (job.getCreatedBy() == null
                || job.getCreatedBy().getId() == null) {
            throw new IllegalArgumentException(
                    "A valid placement officer is required");
        }

        Long officerId = job.getCreatedBy().getId();

        PlacementOfficer officer =
                placementOfficerRepository.findById(officerId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Placement officer not found"));

        if (job.getApplicationDeadline() == null
                || !job.getApplicationDeadline().isAfter(
                OffsetDateTime.now())) {
            throw new IllegalArgumentException(
                    "Application deadline must be in the future");
        }

        validateSalary(job.getSalaryMin(), job.getSalaryMax());

        job.setStatus(JobStatus.DRAFT);

        // Use the persisted officer, not an unverified client-supplied entity.
        Job created = new Job(officer, job.getCompanyName(), job.getJobTitle(),
                job.getJobDescription(), job.getEmploymentType(), job.getWorkMode(),
                job.getApplicationDeadline());
        created.setLocation(job.getLocation());
        created.setMinimumCgpa(job.getMinimumCgpa());
        created.setSalaryMin(job.getSalaryMin());
        created.setSalaryMax(job.getSalaryMax());
        return jobRepository.save(created);
    }

    @Transactional(readOnly = true)
    public Optional<Job> getJobById(Long jobId) {
        return jobRepository.findById(jobId);
    }

    @Transactional(readOnly = true)
    public Page<Job> getOfficerJobs(Long userId, Pageable pageable) {
        return jobRepository.findByCreatedByUserId(userId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Job> searchPublishedJobs(String location, EmploymentType employmentType,
                                         WorkMode workMode, BigDecimal studentCgpa, Pageable pageable) {
        return jobRepository.search(JobStatus.PUBLISHED, normalizeFilter(location), employmentType,
                workMode, studentCgpa, pageable);
    }

    @Transactional(readOnly = true)
    public Job getPublishedJob(Long jobId, BigDecimal studentCgpa) {
        Job job = jobRepository.findById(jobId).orElseThrow(() -> new JobNotFoundException(jobId));
        if (job.getStatus() != JobStatus.PUBLISHED
                || (job.getMinimumCgpa() != null
                && (studentCgpa == null || studentCgpa.compareTo(job.getMinimumCgpa()) < 0))) {
            throw new JobNotFoundException(jobId);
        }
        return job;
    }

    public Job createJobForOfficer(Long userId, Job job, String location, BigDecimal minimumCgpa,
                                   BigDecimal salaryMin, BigDecimal salaryMax) {
        PlacementOfficer officer = placementOfficerRepository.findByUserId(userId)
                .orElseThrow(() -> new AccessDeniedException("No placement officer profile for authenticated user"));
        Job created = new Job(officer, job.getCompanyName(), job.getJobTitle(), job.getJobDescription(),
                job.getEmploymentType(), job.getWorkMode(), job.getApplicationDeadline());
        created.setLocation(location);
        created.setMinimumCgpa(minimumCgpa);
        created.setSalaryMin(salaryMin);
        created.setSalaryMax(salaryMax);
        return createJob(created);
    }

    public Job updateJobForOfficer(Long officerId, Long jobId, Job updatedJob) {
        Job existing = ownedJob(officerId, jobId);
        if (existing.getStatus() == JobStatus.CLOSED) {
            throw new IllegalStateException("Closed jobs cannot be updated");
        }
        if (updatedJob.getApplicationDeadline() == null
                || !updatedJob.getApplicationDeadline().isAfter(OffsetDateTime.now())) {
            throw new IllegalArgumentException("Application deadline must be in the future");
        }
        validateSalary(updatedJob.getSalaryMin(), updatedJob.getSalaryMax());
        existing.setCompanyName(updatedJob.getCompanyName());
        existing.setJobTitle(updatedJob.getJobTitle());
        existing.setJobDescription(updatedJob.getJobDescription());
        existing.setLocation(updatedJob.getLocation());
        existing.setEmploymentType(updatedJob.getEmploymentType());
        existing.setWorkMode(updatedJob.getWorkMode());
        existing.setMinimumCgpa(updatedJob.getMinimumCgpa());
        existing.setSalaryMin(updatedJob.getSalaryMin());
        existing.setSalaryMax(updatedJob.getSalaryMax());
        existing.setApplicationDeadline(updatedJob.getApplicationDeadline());
        return jobRepository.save(existing);
    }

    public Job publishJobForOfficer(Long officerId, Long jobId) {
        ownedJob(officerId, jobId);
        return publishJob(jobId);
    }

    public Job closeJobForOfficer(Long officerId, Long jobId) {
        ownedJob(officerId, jobId);
        return closeJob(jobId);
    }

    public void deleteJobForOfficer(Long officerId, Long jobId) {
        ownedJob(officerId, jobId);
        deleteJob(jobId);
    }

    public Job getOfficerJob(Long officerId, Long jobId) { return ownedJob(officerId, jobId); }

    private Job ownedJob(Long officerId, Long jobId) {
        Job job = jobRepository.findById(jobId).orElseThrow(() -> new JobNotFoundException(jobId));
        if (!job.getCreatedBy().getId().equals(officerId)) {
            throw new AccessDeniedException("Job is managed by another placement officer");
        }
        return job;
    }

    private static String normalizeFilter(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static void validateSalary(BigDecimal minimum, BigDecimal maximum) {
        if (minimum != null && maximum != null && maximum.compareTo(minimum) < 0) {
            throw new IllegalArgumentException("Maximum salary must be greater than or equal to minimum salary");
        }
    }


    @Transactional(readOnly = true)
    public List<Job> getAllJobs() {
        return jobRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Job> getPublishedJobs() {
        return jobRepository.findByStatus(JobStatus.PUBLISHED);
    }

    @Transactional(readOnly = true)
    public List<Job> getJobsByStatus(JobStatus status) {

        if (status == null) {
            throw new IllegalArgumentException("Job status is required");
        }

        return jobRepository.findByStatus(status);
    }

    public Job updateJob(Long jobId, Job updatedJob) {

        if (updatedJob == null) {
            throw new IllegalArgumentException(
                    "Updated job details cannot be null");
        }

        Job existingJob = jobRepository.findById(jobId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Job not found"));

        if (existingJob.getStatus() == JobStatus.CLOSED) {
            throw new IllegalStateException(
                    "Closed jobs cannot be updated");
        }

        existingJob.setCompanyName(updatedJob.getCompanyName());
        existingJob.setJobTitle(updatedJob.getJobTitle());
        existingJob.setJobDescription(updatedJob.getJobDescription());
        existingJob.setLocation(updatedJob.getLocation());
        existingJob.setEmploymentType(updatedJob.getEmploymentType());
        existingJob.setWorkMode(updatedJob.getWorkMode());
        existingJob.setMinimumCgpa(updatedJob.getMinimumCgpa());
        existingJob.setSalaryMin(updatedJob.getSalaryMin());
        existingJob.setSalaryMax(updatedJob.getSalaryMax());
        existingJob.setApplicationDeadline(
                updatedJob.getApplicationDeadline());

        return jobRepository.save(existingJob);
    }

    public Job publishJob(Long jobId) {

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Job not found"));

        if (job.getStatus() != JobStatus.DRAFT) {
            throw new IllegalStateException(
                    "Only draft jobs can be published");
        }

        if (job.getApplicationDeadline() == null
                || !job.getApplicationDeadline().isAfter(
                OffsetDateTime.now())) {
            throw new IllegalStateException(
                    "Cannot publish a job with an expired deadline");
        }

        job.setStatus(JobStatus.PUBLISHED);
        Job published = jobRepository.save(job);
        notificationService.jobPublished(published);
        return published;
    }

    public Job closeJob(Long jobId) {

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Job not found"));

        if (job.getStatus() == JobStatus.CLOSED) {
            throw new IllegalStateException("Job is already closed");
        }

        job.setStatus(JobStatus.CLOSED);

        return jobRepository.save(job);
    }

    public void deleteJob(Long jobId) {

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Job not found"));

        if (job.getStatus() != JobStatus.DRAFT) {
            throw new IllegalStateException(
                    "Only draft jobs can be deleted");
        }

        jobRepository.delete(job);
    }
}
