package com.campusflow.repository;

import com.campusflow.entity.JobSkill;
import com.campusflow.entity.JobSkillId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JobSkillRepository
        extends JpaRepository<JobSkill, JobSkillId> {

    List<JobSkill> findByJobId(Long jobId);

    List<JobSkill> findBySkillId(Long skillId);

    boolean existsByJobIdAndSkillId(Long jobId, Long skillId);
}