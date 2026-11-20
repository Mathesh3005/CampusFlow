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
        dto.setStudentName(application.getStudent().getFullName());
        dto.setStudentRegisterNumber(application.getStudent().getRegisterNumber());
        dto.setStudentDepartment(application.getStudent().getDepartment());
        dto.setStudentCgpa(application.getStudent().getCgpa());
        dto.setJobId(application.getJob().getId());
        dto.setResumeId(
                application.getResume() != null
                        ? application.getResume().getId()
                        : null
        );
        dto.setResumeFileName(
                application.getResume() != null
                        ? application.getResume().getFileName()
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
