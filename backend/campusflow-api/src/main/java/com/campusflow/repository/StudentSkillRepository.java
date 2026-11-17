package com.campusflow.repository;

import com.campusflow.entity.StudentSkill;
import com.campusflow.entity.StudentSkillId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import java.util.Optional;

import java.util.List;

public interface StudentSkillRepository
        extends JpaRepository<StudentSkill, StudentSkillId> {

    @EntityGraph(attributePaths = "skill")
    List<StudentSkill> findByStudentId(Long studentId);

    @Override
    @EntityGraph(attributePaths = "skill")
    Optional<StudentSkill> findById(StudentSkillId id);

    List<StudentSkill> findBySkillId(Long skillId);

    boolean existsByStudentIdAndSkillId(Long studentId, Long skillId);
}
