package com.campusflow.dto.projectskill;

import jakarta.validation.constraints.NotNull;

public class ProjectSkillRequestDto {

    @NotNull
    private Long skillId;

    public Long getSkillId() {
        return skillId;
    }

    public void setSkillId(Long skillId) {
        this.skillId = skillId;
    }
}
