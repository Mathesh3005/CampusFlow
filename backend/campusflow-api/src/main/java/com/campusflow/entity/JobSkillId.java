package com.campusflow.entity;

import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class JobSkillId implements Serializable {

    private Long jobId;
    private Long skillId;

    public JobSkillId() {
    }

    public JobSkillId(Long jobId, Long skillId) {
        this.jobId = jobId;
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

        JobSkillId that = (JobSkillId) object;

        return Objects.equals(jobId, that.jobId)
                && Objects.equals(skillId, that.skillId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(jobId, skillId);
    }
}