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

@Service
@Transactional
public class JobService {

    private final JobRepository jobRepository;
    private final PlacementOfficerRepository placementOfficerRepository;

    public JobService(
            JobRepository jobRepository,
            PlacementOfficerRepository placementOfficerRepository) {
        this.jobRepository = jobRepository;
        this.placementOfficerRepository = placementOfficerRepository;
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

        job.setStatus(JobStatus.DRAFT);

        // Use the persisted officer, not an unverified client-supplied entity.
        return jobRepository.save(
                new Job(
                        officer,
                        job.getCompanyName(),
                        job.getJobTitle(),
                        job.getJobDescription(),
                        job.getEmploymentType(),
                        job.getWorkMode(),
                        job.getApplicationDeadline()
                )
        );
    }

    @Transactional(readOnly = true)
    public Optional<Job> getJobById(Long jobId) {
        return jobRepository.findById(jobId);
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

        return jobRepository.save(job);
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