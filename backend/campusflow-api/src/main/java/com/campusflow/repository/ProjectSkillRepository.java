package com.campusflow.repository;

import com.campusflow.entity.ProjectSkill;
import com.campusflow.entity.ProjectSkillId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProjectSkillRepository
        extends JpaRepository<ProjectSkill, ProjectSkillId> {

    @EntityGraph(attributePaths = "skill")
    List<ProjectSkill> findByProjectId(Long projectId);

    List<ProjectSkill> findBySkillId(Long skillId);

    boolean existsByProjectIdAndSkillId(Long projectId, Long skillId);

    @Modifying
    @Query("DELETE FROM ProjectSkill projectSkill WHERE projectSkill.project.id = :projectId")
    int deleteAllByProjectId(@Param("projectId") Long projectId);
}
