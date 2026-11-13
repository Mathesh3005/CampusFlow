package com.campusflow.entity;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.FetchType;

@Entity
@Table(name = "job_skills")
public class JobSkill {

    @EmbeddedId
    private JobSkillId id;

    @MapsId("jobId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @MapsId("skillId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "skill_id", nullable = false)
    private Skill skill;

    protected JobSkill() {
        // Required by JPA
    }

    public JobSkill(Job job, Skill skill) {
        this.job = job;
        this.skill = skill;
        this.id = new JobSkillId(job.getId(), skill.getId());
    }

    public JobSkillId getId() {
        return id;
    }

    public Job getJob() {
        return job;
    }

    public Skill getSkill() {
        return skill;
    }

}