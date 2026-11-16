package com.campusflow.service;

import java.time.OffsetDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.campusflow.dto.dashboard.OfficerDashboardResponseDto;
import com.campusflow.entity.ApplicationStatus;
import com.campusflow.entity.InterviewStatus;
import com.campusflow.entity.JobStatus;
import com.campusflow.entity.PlacementOfficer;
import com.campusflow.repository.ApplicationRepository;
import com.campusflow.repository.InterviewRepository;
import com.campusflow.repository.JobRepository;

@Service
public class OfficerDashboardService {

    private final JobRepository jobRepository;
    private final ApplicationRepository applicationRepository;
    private final InterviewRepository interviewRepository;

    public OfficerDashboardService(
            JobRepository jobRepository,
            ApplicationRepository applicationRepository,
            InterviewRepository interviewRepository) {

        this.jobRepository = jobRepository;
        this.applicationRepository = applicationRepository;
        this.interviewRepository = interviewRepository;
    }

    @Transactional(readOnly = true)
    public OfficerDashboardResponseDto getDashboard(
            PlacementOfficer officer) {

        Long officerId = officer.getId();
        Long userId = officer.getUser().getId();

        OfficerDashboardResponseDto response =
                new OfficerDashboardResponseDto();

        response.setTotalJobs(
                jobRepository.countByCreatedBy_Id(officerId));

        response.setPublishedJobs(
                jobRepository.countByCreatedBy_IdAndStatus(
                        officerId,
                        JobStatus.PUBLISHED));

        response.setDraftJobs(
                jobRepository.countByCreatedBy_IdAndStatus(
                        officerId,
                        JobStatus.DRAFT));

        response.setClosedJobs(
                jobRepository.countByCreatedBy_IdAndStatus(
                        officerId,
                        JobStatus.CLOSED));

        response.setTotalApplications(
                applicationRepository.countByJob_CreatedBy_User_Id(
                        userId));

        long applied = applicationRepository
                .countByJob_CreatedBy_User_IdAndStatus(
                        userId,
                        ApplicationStatus.APPLIED);

        long underReview = applicationRepository
                .countByJob_CreatedBy_User_IdAndStatus(
                        userId,
                        ApplicationStatus.UNDER_REVIEW);

        response.setUnderReviewApplications(underReview);
        response.setShortlistedApplications(applicationRepository
                .countByJob_CreatedBy_User_IdAndStatus(userId, ApplicationStatus.SHORTLISTED));
        response.setSelectedApplications(applicationRepository
                .countByJob_CreatedBy_User_IdAndStatus(userId, ApplicationStatus.SELECTED));
        response.setRejectedApplications(applicationRepository
                .countByJob_CreatedBy_User_IdAndStatus(userId, ApplicationStatus.REJECTED));
        response.setWithdrawnApplications(applicationRepository
                .countByJob_CreatedBy_User_IdAndStatus(userId, ApplicationStatus.WITHDRAWN));

        response.setPendingApplications(applied + underReview);

        response.setScheduledInterviews(
                interviewRepository
                        .countByApplication_Job_CreatedBy_User_IdAndStatusAndScheduledAtAfter(
                                userId,
                                InterviewStatus.SCHEDULED,
                                OffsetDateTime.now()));

        return response;
    }
}