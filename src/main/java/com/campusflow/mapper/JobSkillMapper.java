package com.campusflow.mapper;

import com.campusflow.dto.jobskill.JobSkillResponseDto;
import com.campusflow.entity.JobSkill;

public class JobSkillMapper {

    private JobSkillMapper() {
    }

    public static JobSkillResponseDto toResponseDto(JobSkill jobSkill) {

        if (jobSkill == null) {
            return null;
        }

        JobSkillResponseDto dto = new JobSkillResponseDto();

        dto.setSkillId(jobSkill.getSkill().getId());
        dto.setSkillName(jobSkill.getSkill().getName());

        return dto;
    }
}