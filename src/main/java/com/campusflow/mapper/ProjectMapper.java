package com.campusflow.mapper;

import com.campusflow.dto.project.ProjectRequestDto;
import com.campusflow.dto.project.ProjectResponseDto;
import com.campusflow.entity.Project;

public class ProjectMapper {

    private ProjectMapper() {
    }

    public static ProjectResponseDto toResponseDto(Project project) {

        if (project == null) {
            return null;
        }

        ProjectResponseDto dto = new ProjectResponseDto();

        dto.setId(project.getId());
        dto.setStudentId(project.getStudent().getId());
        dto.setTitle(project.getTitle());
        dto.setDescription(project.getDescription());
        dto.setGithubUrl(project.getGithubUrl());
        dto.setLiveDemoUrl(project.getLiveDemoUrl());
        dto.setStartDate(project.getStartDate());
        dto.setEndDate(project.getEndDate());
        dto.setCreatedAt(project.getCreatedAt());
        dto.setUpdatedAt(project.getUpdatedAt());

        return dto;
    }

    public static void updateProjectFromDto(
            ProjectRequestDto dto,
            Project project) {

        project.setTitle(dto.getTitle());
        project.setDescription(dto.getDescription());
        project.setGithubUrl(dto.getGithubUrl());
        project.setLiveDemoUrl(dto.getLiveDemoUrl());
        project.setStartDate(dto.getStartDate());
        project.setEndDate(dto.getEndDate());
    }
}
