package com.campusflow.mapper;

import com.campusflow.dto.studentskill.StudentSkillResponseDto;
import com.campusflow.entity.StudentSkill;

public class StudentSkillMapper {

    private StudentSkillMapper() {
    }

    public static StudentSkillResponseDto toResponseDto(StudentSkill studentSkill) {

        if (studentSkill == null) {
            return null;
        }

        StudentSkillResponseDto dto = new StudentSkillResponseDto();

        dto.setSkillId(studentSkill.getSkill().getId());
        dto.setSkillName(studentSkill.getSkill().getName());
        dto.setProficiencyLevel(studentSkill.getProficiencyLevel());
        dto.setCreatedAt(studentSkill.getCreatedAt());

        return dto;
    }
}