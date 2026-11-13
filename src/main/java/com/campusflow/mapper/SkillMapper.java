package com.campusflow.mapper;

import com.campusflow.dto.skill.SkillResponseDto;
import com.campusflow.entity.Skill;

public class SkillMapper {

    private SkillMapper() {
    }

    public static SkillResponseDto toResponseDto(Skill skill) {

        if (skill == null) {
            return null;
        }

        SkillResponseDto dto = new SkillResponseDto();

        dto.setId(skill.getId());
        dto.setName(skill.getName());

        return dto;
    }
}