package com.campusflow.service;

import com.campusflow.entity.*;
import com.campusflow.repository.*;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
@Transactional
public class InterviewService {

    private final InterviewRepository interviewRepository;
    private final ApplicationRepository applicationRepository;

    public InterviewService(
            InterviewRepository interviewRepository,
            ApplicationRepository applicationRepository) {

        this.interviewRepository = interviewRepository;
        this.applicationRepository = applicationRepository;
    }

    // Schedule an interview
    public Interview scheduleInterview(
            Long applicationId,
            OffsetDateTime scheduledAt,
            InterviewMode interviewMode,
            String locationOrLink,
            String notes) {

        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        if (application.getStatus() != ApplicationStatus.SHORTLISTED) {
            throw new RuntimeException(
                    "Only shortlisted applicants can be scheduled for interviews");
        }

        if (scheduledAt == null || !scheduledAt.isAfter(OffsetDateTime.now())) {
            throw new IllegalArgumentException(
                    "Interview date and time must be in the future");
        }

        if (interviewMode == null) {
            throw new IllegalArgumentException("Interview mode is required");
        }

        if (locationOrLink == null || locationOrLink.isBlank()) {
            throw new IllegalArgumentException(
                    "Interview location or meeting link is required");
        }

        Interview interview = new Interview(
                application,
                scheduledAt,
                interviewMode
        );

        interview.setLocationOrLink(locationOrLink.trim());
        interview.setNotes(notes);

        return interviewRepository.save(interview);
    }

    // Get interview by ID
    @Transactional(readOnly = true)
    public Interview getInterviewById(Long interviewId) {

        return interviewRepository.findById(interviewId)
                .orElseThrow(() -> new RuntimeException("Interview not found"));
    }

    // Get all interviews for an application
    @Transactional(readOnly = true)
    public List<Interview> getInterviewsByApplication(Long applicationId) {

        if (!applicationRepository.existsById(applicationId)) {
            throw new RuntimeException("Application not found");
        }

        return interviewRepository.findByApplicationId(applicationId);
    }

    // Get interviews by status
    @Transactional(readOnly = true)
    public List<Interview> getInterviewsByStatus(InterviewStatus status) {

        if (status == null) {
            throw new IllegalArgumentException("Interview status is required");
        }

        return interviewRepository.findByStatus(status);
    }

    // Update interview schedule
    public Interview rescheduleInterview(
            Long interviewId,
            OffsetDateTime newScheduledAt,
            String newLocationOrLink) {

        Interview interview = getInterviewById(interviewId);

        if (interview.getStatus() != InterviewStatus.SCHEDULED) {
            throw new RuntimeException(
                    "Only scheduled interviews can be rescheduled");
        }

        if (newScheduledAt == null ||
                !newScheduledAt.isAfter(OffsetDateTime.now())) {
            throw new IllegalArgumentException(
                    "New interview date and time must be in the future");
        }

        if (newLocationOrLink == null || newLocationOrLink.isBlank()) {
            throw new IllegalArgumentException(
                    "Interview location or meeting link is required");
        }

        interview.setScheduledAt(newScheduledAt);
        interview.setLocationOrLink(newLocationOrLink.trim());

        return interviewRepository.save(interview);
    }

    // Mark interview as completed
    public Interview completeInterview(Long interviewId) {

        Interview interview = getInterviewById(interviewId);

        if (interview.getStatus() != InterviewStatus.SCHEDULED) {
            throw new RuntimeException(
                    "Only scheduled interviews can be completed");
        }

        interview.setStatus(InterviewStatus.COMPLETED);

        return interviewRepository.save(interview);
    }

    // Cancel interview
    public Interview cancelInterview(Long interviewId) {

        Interview interview = getInterviewById(interviewId);

        if (interview.getStatus() != InterviewStatus.SCHEDULED) {
            throw new RuntimeException(
                    "Only scheduled interviews can be cancelled");
        }

        interview.setStatus(InterviewStatus.CANCELLED);

        return interviewRepository.save(interview);
    }
}