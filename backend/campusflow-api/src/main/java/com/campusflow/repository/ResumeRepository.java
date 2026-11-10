package com.campusflow.repository;

import com.campusflow.entity.Resume;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ResumeRepository extends JpaRepository<Resume, Long> {

    List<Resume> findByStudentId(Long studentId);

    Optional<Resume> findByIdAndStudentId(Long resumeId, Long studentId);

    boolean existsByStudentId(Long studentId);
}