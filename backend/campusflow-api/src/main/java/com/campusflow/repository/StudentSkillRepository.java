package com.campusflow.repository;

import com.campusflow.entity.StudentSkill;
import com.campusflow.entity.StudentSkillId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StudentSkillRepository
        extends JpaRepository<StudentSkill, StudentSkillId> {

    List<StudentSkill> findByStudentId(Long studentId);

    List<StudentSkill> findBySkillId(Long skillId);

    boolean existsByStudentIdAndSkillId(Long studentId, Long skillId);
}