package com.campusflow.mapper;

import com.campusflow.dto.job.JobRequestDto;
import com.campusflow.dto.job.JobResponseDto;
import com.campusflow.entity.Job;

public class JobMapper {

    private JobMapper() {
    }

    public static JobResponseDto toResponseDto(Job job) {

        if (job == null) {
            return null;
        }

        JobResponseDto dto = new JobResponseDto();

        dto.setId(job.getId());
        dto.setCreatedById(job.getCreatedBy().getId());
        dto.setCompanyName(job.getCompanyName());
        dto.setJobTitle(job.getJobTitle());
        dto.setJobDescription(job.getJobDescription());
        dto.setLocation(job.getLocation());
        dto.setEmploymentType(job.getEmploymentType());
        dto.setWorkMode(job.getWorkMode());
        dto.setMinimumCgpa(job.getMinimumCgpa());
        dto.setSalaryMin(job.getSalaryMin());
        dto.setSalaryMax(job.getSalaryMax());
        dto.setApplicationDeadline(job.getApplicationDeadline());
        dto.setStatus(job.getStatus());
        dto.setCreatedAt(job.getCreatedAt());
        dto.setUpdatedAt(job.getUpdatedAt());

        return dto;
    }

    public static void updateJobFromDto(
            JobRequestDto dto,
            Job job) {

        job.setCompanyName(dto.getCompanyName());
        job.setJobTitle(dto.getJobTitle());
        job.setJobDescription(dto.getJobDescription());
        job.setLocation(dto.getLocation());
        job.setEmploymentType(dto.getEmploymentType());
        job.setWorkMode(dto.getWorkMode());
        job.setMinimumCgpa(dto.getMinimumCgpa());
        job.setSalaryMin(dto.getSalaryMin());
        job.setSalaryMax(dto.getSalaryMax());
        job.setApplicationDeadline(dto.getApplicationDeadline());
    }
}