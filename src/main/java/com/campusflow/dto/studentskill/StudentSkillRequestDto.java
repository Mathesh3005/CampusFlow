package com.campusflow.dto.studentskill;

import com.campusflow.entity.ProficiencyLevel;

public class StudentSkillRequestDto {

    private Long skillId;
    private ProficiencyLevel proficiencyLevel;

    public Long getSkillId() {
        return skillId;
    }

    public void setSkillId(Long skillId) {
        this.skillId = skillId;
    }

    public ProficiencyLevel getProficiencyLevel() {
        return proficiencyLevel;
    }

    public void setProficiencyLevel(ProficiencyLevel proficiencyLevel) {
        this.proficiencyLevel = proficiencyLevel;
    }
}