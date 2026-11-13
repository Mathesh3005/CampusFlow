package com.campusflow.service;

import com.campusflow.entity.*;
import com.campusflow.repository.*;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import com.campusflow.exception.ApplicationNotFoundException;
import com.campusflow.exception.InterviewNotFoundException;
import com.campusflow.exception.InvalidInterviewOperationException;
import java.util.Objects;

@Service
@Transactional
public class InterviewService {

    private final InterviewRepository interviewRepository;
    private final ApplicationRepository applicationRepository;
    private final NotificationService notificationService;

    public InterviewService(
            InterviewRepository interviewRepository,
            ApplicationRepository applicationRepository,
            NotificationService notificationService) {

        this.interviewRepository = interviewRepository;
        this.applicationRepository = applicationRepository;
        this.notificationService = notificationService;
    }

    // Schedule an interview
    public Interview scheduleInterview(
            Long applicationId,
            OffsetDateTime scheduledAt,
            InterviewMode interviewMode,
            String locationOrLink,
            String notes) {

        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ApplicationNotFoundException(applicationId));

        if (application.getStatus() != ApplicationStatus.SHORTLISTED) {
            throw new InvalidInterviewOperationException(
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

        Interview saved = interviewRepository.save(interview);
        notificationService.interviewScheduled(saved);
        return saved;
    }

    // Get interview by ID
    @Transactional(readOnly = true)
    public Interview getInterviewById(Long interviewId) {

        return interviewRepository.findById(interviewId)
                .orElseThrow(() -> new InterviewNotFoundException(interviewId));
    }

    // Get all interviews for an application
    @Transactional(readOnly = true)
    public List<Interview> getInterviewsByApplication(Long applicationId) {

        if (!applicationRepository.existsById(applicationId)) {
            throw new ApplicationNotFoundException(applicationId);
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
            throw new InvalidInterviewOperationException(
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

        boolean changed = !Objects.equals(interview.getScheduledAt(), newScheduledAt)
                || !Objects.equals(interview.getLocationOrLink(), newLocationOrLink.trim());
        interview.setScheduledAt(newScheduledAt);
        interview.setLocationOrLink(newLocationOrLink.trim());
        Interview saved = interviewRepository.save(interview);
        if (changed) notificationService.interviewUpdated(saved);
        return saved;
    }

    // Mark interview as completed
    public Interview completeInterview(Long interviewId) {

        Interview interview = getInterviewById(interviewId);

        if (interview.getStatus() != InterviewStatus.SCHEDULED) {
            throw new InvalidInterviewOperationException(
                    "Only scheduled interviews can be completed");
        }

        interview.setStatus(InterviewStatus.COMPLETED);

        return interviewRepository.save(interview);
    }

    // Cancel interview
    public Interview cancelInterview(Long interviewId) {

        Interview interview = getInterviewById(interviewId);

        if (interview.getStatus() != InterviewStatus.SCHEDULED) {
            throw new InvalidInterviewOperationException(
                    "Only scheduled interviews can be cancelled");
        }

        interview.setStatus(InterviewStatus.CANCELLED);
        Interview saved = interviewRepository.save(interview);
        notificationService.interviewCancelled(saved);
        return saved;
    }

    public Interview scheduleForOfficer(Long applicationId, Long officerUserId,
                                        OffsetDateTime scheduledAt, InterviewMode mode,
                                        String locationOrLink, String notes) {
        Application application = applicationRepository.findByIdAndJob_CreatedBy_User_Id(applicationId, officerUserId)
                .orElseThrow(() -> new ApplicationNotFoundException(applicationId));
        if (application.getStatus() != ApplicationStatus.SHORTLISTED) {
            throw new InvalidInterviewOperationException(
                    "Only shortlisted applicants can be scheduled for interviews");
        }
        validateSchedule(scheduledAt, mode, locationOrLink);
        Interview interview = new Interview(application, scheduledAt, mode);
        interview.setLocationOrLink(locationOrLink.trim());
        interview.setNotes(notes);
        Interview saved = interviewRepository.save(interview);
        notificationService.interviewScheduled(saved);
        return saved;
    }

    @Transactional(readOnly = true)
    public Page<Interview> getInterviewsForOfficer(Long officerUserId, Pageable pageable) {
        return interviewRepository.findByApplication_Job_CreatedBy_User_Id(officerUserId, pageable);
    }

    @Transactional(readOnly = true)
    public Interview getInterviewForOfficer(Long interviewId, Long officerUserId) {
        return interviewRepository.findByIdAndApplication_Job_CreatedBy_User_Id(interviewId, officerUserId)
                .orElseThrow(() -> new InterviewNotFoundException(interviewId));
    }

    @Transactional(readOnly = true)
    public Page<Interview> getInterviewsForStudent(Long studentId, Pageable pageable) {
        return interviewRepository.findByApplication_Student_Id(studentId, pageable);
    }

    @Transactional(readOnly = true)
    public Interview getInterviewForStudent(Long interviewId, Long studentId) {
        return interviewRepository.findByIdAndApplication_Student_Id(interviewId, studentId)
                .orElseThrow(() -> new InterviewNotFoundException(interviewId));
    }

    public Interview updateForOfficer(Long interviewId, Long officerUserId,
                                      OffsetDateTime scheduledAt, InterviewMode mode,
                                      String locationOrLink, String notes) {
        Interview interview = getInterviewForOfficer(interviewId, officerUserId);
        requireScheduled(interview, "Only scheduled interviews can be updated");
        validateSchedule(scheduledAt, mode, locationOrLink);
        boolean changed = !Objects.equals(interview.getScheduledAt(), scheduledAt)
                || interview.getInterviewMode() != mode
                || !Objects.equals(interview.getLocationOrLink(), locationOrLink.trim())
                || !Objects.equals(interview.getNotes(), notes);
        interview.setScheduledAt(scheduledAt);
        interview.setInterviewMode(mode);
        interview.setLocationOrLink(locationOrLink.trim());
        interview.setNotes(notes);
        Interview saved = interviewRepository.save(interview);
        if (changed) notificationService.interviewUpdated(saved);
        return saved;
    }

    public Interview updateStatusForOfficer(Long interviewId, Long officerUserId, InterviewStatus newStatus) {
        Interview interview = getInterviewForOfficer(interviewId, officerUserId);
        requireScheduled(interview, "Only scheduled interviews can change status");
        if (newStatus != InterviewStatus.COMPLETED && newStatus != InterviewStatus.CANCELLED) {
            throw new InvalidInterviewOperationException("Scheduled interviews can only be completed or cancelled");
        }
        interview.setStatus(newStatus);
        Interview saved = interviewRepository.save(interview);
        if (newStatus == InterviewStatus.CANCELLED) notificationService.interviewCancelled(saved);
        return saved;
    }

    public void deleteForOfficer(Long interviewId, Long officerUserId) {
        Interview interview = getInterviewForOfficer(interviewId, officerUserId);
        interviewRepository.delete(interview);
    }

    private static void validateSchedule(OffsetDateTime scheduledAt, InterviewMode mode, String locationOrLink) {
        if (scheduledAt == null || !scheduledAt.isAfter(OffsetDateTime.now())) {
            throw new IllegalArgumentException("Interview date and time must be in the future");
        }
        if (mode == null) throw new IllegalArgumentException("Interview mode is required");
        if (locationOrLink == null || locationOrLink.isBlank()) {
            throw new IllegalArgumentException("Interview location or meeting link is required");
        }
        if (locationOrLink.length() > 500) {
            throw new IllegalArgumentException("Interview location or meeting link must not exceed 500 characters");
        }
    }

    private static void requireScheduled(Interview interview, String message) {
        if (interview.getStatus() != InterviewStatus.SCHEDULED) {
            throw new InvalidInterviewOperationException(message);
        }
    }
}
