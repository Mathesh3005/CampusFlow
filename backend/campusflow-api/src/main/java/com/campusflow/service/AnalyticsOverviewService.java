package com.campusflow.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.campusflow.dto.analytics.AnalyticsOverviewResponseDto;
import com.campusflow.entity.ApplicationStatus;
import com.campusflow.entity.PlacementOfficer;
import com.campusflow.repository.ApplicationRepository;
import com.campusflow.repository.JobRepository;
import com.campusflow.repository.StudentRepository;

@Service
public class AnalyticsOverviewService {

    private final StudentRepository studentRepository;
    private final JobRepository jobRepository;
    private final ApplicationRepository applicationRepository;

    public AnalyticsOverviewService(
            StudentRepository studentRepository,
            JobRepository jobRepository,
            ApplicationRepository applicationRepository) {
        this.studentRepository = studentRepository;
        this.jobRepository = jobRepository;
        this.applicationRepository = applicationRepository;
    }

    @Transactional(readOnly = true)
    public AnalyticsOverviewResponseDto getOverview(
            PlacementOfficer officer) {

        Long officerId = officer.getId();
        Long userId = officer.getUser().getId();

        long totalStudents = studentRepository.count();

        long totalJobs =
                jobRepository.countByCreatedBy_Id(officerId);

        long publishedJobs =
                jobRepository.countByCreatedBy_IdAndStatus(
                        officerId,
                        com.campusflow.entity.JobStatus.PUBLISHED);

        long totalApplications =
                applicationRepository.countByJob_CreatedBy_User_Id(userId);

        long totalApplicants =
                applicationRepository.countDistinctStudentsByOfficer(userId);

        long selectedStudents =
                applicationRepository.countDistinctStudentsByOfficerAndStatus(
                        userId,
                        ApplicationStatus.SELECTED);

        long selectedApplications =
                applicationRepository.countByJob_CreatedBy_User_IdAndStatus(
                        userId,
                        ApplicationStatus.SELECTED);

        BigDecimal placementRate = totalStudents == 0
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(selectedStudents)
                        .multiply(BigDecimal.valueOf(100))
                        .divide(
                                BigDecimal.valueOf(totalStudents),
                                2,
                                RoundingMode.HALF_UP);

        BigDecimal applicationSelectionRate = totalApplications == 0
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(selectedApplications)
                        .multiply(BigDecimal.valueOf(100))
                        .divide(BigDecimal.valueOf(totalApplications), 2, RoundingMode.HALF_UP);

        AnalyticsOverviewResponseDto response =
                new AnalyticsOverviewResponseDto();

        response.setTotalStudents(totalStudents);
        response.setTotalJobs(totalJobs);
        response.setPublishedJobs(publishedJobs);
        response.setTotalApplications(totalApplications);
        response.setTotalApplicants(totalApplicants);
        response.setSelectedStudents(selectedStudents);
        response.setSelectedApplications(selectedApplications);
        response.setPlacementRate(placementRate);
        response.setApplicationSelectionRate(applicationSelectionRate);

        return response;
    }
}