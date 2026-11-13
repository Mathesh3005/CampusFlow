package com.campusflow.mapper;

import com.campusflow.dto.application.ApplicationResponseDto;
import com.campusflow.entity.Application;

public class ApplicationMapper {

    private ApplicationMapper() {
    }

    public static ApplicationResponseDto toResponseDto(Application application) {

        if (application == null) {
            return null;
        }

        ApplicationResponseDto dto = new ApplicationResponseDto();

        dto.setId(application.getId());
        dto.setStudentId(application.getStudent().getId());
        dto.setJobId(application.getJob().getId());
        dto.setResumeId(
                application.getResume() != null
                        ? application.getResume().getId()
                        : null
        );
        dto.setCompanyName(application.getJob().getCompanyName());
        dto.setJobTitle(application.getJob().getJobTitle());
        dto.setCoverLetter(application.getCoverLetter());
        dto.setStatus(application.getStatus());
        dto.setAppliedAt(application.getAppliedAt());
        dto.setUpdatedAt(application.getUpdatedAt());

        return dto;
    }
}
