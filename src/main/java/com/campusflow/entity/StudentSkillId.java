package com.campusflow.entity;

import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class StudentSkillId implements Serializable {

    private Long studentId;
    private Long skillId;

    public StudentSkillId() {
    }

    public StudentSkillId(Long studentId, Long skillId) {
        this.studentId = studentId;
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

        StudentSkillId that = (StudentSkillId) object;

        return Objects.equals(studentId, that.studentId)
                && Objects.equals(skillId, that.skillId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(studentId, skillId);
    }
}