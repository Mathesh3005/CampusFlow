package com.campusflow.mapper;

import com.campusflow.dto.resume.ResumeResponseDto;
import com.campusflow.entity.Resume;

public class ResumeMapper {

    private ResumeMapper() {
    }

    public static ResumeResponseDto toResponseDto(Resume resume) {

        if (resume == null) {
            return null;
        }

        ResumeResponseDto dto = new ResumeResponseDto();

        dto.setId(resume.getId());
        dto.setStudentId(resume.getStudent().getId());
        dto.setFileName(resume.getFileName());
        dto.setFileSize(resume.getFileSize());
        dto.setContentType(resume.getContentType());
        dto.setIsActive(resume.getIsActive());
        dto.setUploadedAt(resume.getUploadedAt());

        return dto;
    }
}