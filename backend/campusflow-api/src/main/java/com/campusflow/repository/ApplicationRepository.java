package com.campusflow.repository;

import com.campusflow.entity.Application;
import com.campusflow.entity.ApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;

public interface ApplicationRepository
        extends JpaRepository<Application, Long> {

    List<Application> findByStudentId(Long studentId);

    List<Application> findByJobId(Long jobId);

    List<Application> findByStatus(ApplicationStatus status);

    boolean existsByStudentIdAndJobId(Long studentId, Long jobId);

    boolean existsByResume_Id(Long resumeId);

    @EntityGraph(attributePaths = {"student", "job", "resume"})
    Page<Application> findByStudentId(Long studentId, Pageable pageable);

    @EntityGraph(attributePaths = {"student", "job", "resume"})
    Optional<Application> findByIdAndStudentId(Long applicationId, Long studentId);

    @EntityGraph(attributePaths = {"student", "job", "resume"})
    Page<Application> findByJob_CreatedBy_User_Id(Long userId, Pageable pageable);

    @EntityGraph(attributePaths = {"student", "job", "resume"})
    Optional<Application> findByIdAndJob_CreatedBy_User_Id(Long applicationId, Long userId);
}
