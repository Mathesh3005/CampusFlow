package com.campusflow.repository;

import com.campusflow.entity.ProjectSkill;
import com.campusflow.entity.ProjectSkillId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectSkillRepository
        extends JpaRepository<ProjectSkill, ProjectSkillId> {

    List<ProjectSkill> findByProjectId(Long projectId);

    List<ProjectSkill> findBySkillId(Long skillId);

    boolean existsByProjectIdAndSkillId(Long projectId, Long skillId);
}