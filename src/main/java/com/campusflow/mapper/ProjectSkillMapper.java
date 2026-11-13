package com.campusflow.mapper;

import com.campusflow.dto.projectskill.ProjectSkillResponseDto;
import com.campusflow.entity.ProjectSkill;

public class ProjectSkillMapper {

    private ProjectSkillMapper() {
    }

    public static ProjectSkillResponseDto toResponseDto(ProjectSkill projectSkill) {

        if (projectSkill == null) {
            return null;
        }

        ProjectSkillResponseDto dto = new ProjectSkillResponseDto();

        dto.setSkillId(projectSkill.getSkill().getId());
        dto.setSkillName(projectSkill.getSkill().getName());

        return dto;
    }
}