package com.campusflow.dto.student;

import com.campusflow.entity.Application;
import com.campusflow.entity.ApplicationStatus;

import java.time.OffsetDateTime;

public record OfficerStudentApplicationSummaryDto(
        Long id,
        Long jobId,
        String jobTitle,
        String companyName,
        ApplicationStatus status,
        OffsetDateTime appliedAt) {

    public static OfficerStudentApplicationSummaryDto from(Application application) {
        return new OfficerStudentApplicationSummaryDto(
                application.getId(),
                application.getJob().getId(),
                application.getJob().getJobTitle(),
                application.getJob().getCompanyName(),
                application.getStatus(),
                application.getAppliedAt());
    }
}
