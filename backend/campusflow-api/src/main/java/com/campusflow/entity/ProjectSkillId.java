package com.campusflow.entity;

import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class ProjectSkillId implements Serializable {

    private Long projectId;
    private Long skillId;

    public ProjectSkillId() {
    }

    public ProjectSkillId(Long projectId, Long skillId) {
        this.projectId = projectId;
        this.skillId = skillId;
    }

    @Override
    public boolean equals(Object object) {
        if (this == object) {
            return true;
        }

        if (object == null || getClass() != object.getClass()) {
            return false;
        }

        ProjectSkillId that = (ProjectSkillId) object;

        return Objects.equals(projectId, that.projectId)
                && Objects.equals(skillId, that.skillId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(projectId, skillId);
    }
}