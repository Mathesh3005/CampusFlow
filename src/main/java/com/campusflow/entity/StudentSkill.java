package com.campusflow.entity;

import jakarta.persistence.*;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import jakarta.persistence.Column;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "student_skills")
public class StudentSkill {

    @EmbeddedId
    private StudentSkillId id;

    @MapsId("studentId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    // Add the new relationship here
    @MapsId("skillId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "skill_id", nullable = false)
    private Skill skill;

    @Enumerated(EnumType.STRING)
    @Column(name = "proficiency_level", length = 20)
    private ProficiencyLevel proficiencyLevel;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    protected StudentSkill() {
        // Required by JPA
    }

    public StudentSkill(
            Student student,
            Skill skill,
            ProficiencyLevel proficiencyLevel
    ) {
        this.student = student;
        this.skill = skill;
        this.id = new StudentSkillId(student.getId(), skill.getId());
        this.proficiencyLevel = proficiencyLevel;
    }

    public StudentSkillId getId() {
        return id;
    }

    public Student getStudent() {
        return student;
    }

    public Skill getSkill() {
        return skill;
    }

    public ProficiencyLevel getProficiencyLevel() {
        return proficiencyLevel;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setProficiencyLevel(ProficiencyLevel proficiencyLevel) {
        this.proficiencyLevel = proficiencyLevel;
    }


}