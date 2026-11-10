package com.campusflow.entity;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;

public class ProjectSkill {

    @EmbeddedId
    private ProjectSkillId id;

    @MapsId("projectId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @MapsId("skillId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "skill_id", nullable = false)
    private Skill skill;
    protected ProjectSkill() {
    }

    public ProjectSkill(Project project, Skill skill) {
        this.project = project;
        this.skill = skill;

        this.id = new ProjectSkillId(
                project.getId(),
                skill.getId()
        );
    }

    public ProjectSkillId getId() {
        return id;
    }

    public Project getProject() {
        return project;
    }

    public Skill getSkill() {
        return skill;
    }

}
