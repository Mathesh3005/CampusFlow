package com.campusflow.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.campusflow.entity.Application;
import com.campusflow.entity.ApplicationStatus;

public interface ApplicationRepository
        extends JpaRepository<Application, Long> {

    List<Application> findByStudentId(Long studentId);

    List<Application> findByJobId(Long jobId);

    List<Application> findByStatus(ApplicationStatus status);

    boolean existsByStudentIdAndJobId(Long studentId, Long jobId);

    boolean existsByResume_Id(Long resumeId);

    long countByJob_CreatedBy_Id(Long officerId);

    long countByJob_CreatedBy_IdAndStatus(
        Long officerId,
        ApplicationStatus status
    );

    @Query("""
        SELECT a.status, COUNT(a)
        FROM Application a
        WHERE a.student.id = :studentId
        GROUP BY a.status
        """)
        List<Object[]> countApplicationsByStatus(
        @Param("studentId") Long studentId
    );

    @EntityGraph(attributePaths = {"student", "job", "resume"})
    Page<Application> findByStudentId(Long studentId, Pageable pageable);

    @EntityGraph(attributePaths = {"student", "job", "resume"})
    Optional<Application> findByIdAndStudentId(Long applicationId, Long studentId);

    @EntityGraph(attributePaths = {"student", "job", "resume"})
    Page<Application> findByJob_CreatedBy_User_Id(Long userId, Pageable pageable);

    @EntityGraph(attributePaths = {"student", "job", "resume"})
    Optional<Application> findByIdAndJob_CreatedBy_User_Id(Long applicationId, Long userId);

    long countByJob_CreatedBy_User_Id(Long userId);

    long countByJob_CreatedBy_User_IdAndStatus(
            Long userId,
            ApplicationStatus status
    );

    @Query("""
    SELECT COUNT(DISTINCT a.student.id)
    FROM Application a
    WHERE a.job.createdBy.user.id = :userId
      AND a.status = :status
    """)
    long countDistinctStudentsByOfficerAndStatus(
            @Param("userId") Long userId,
            @Param("status") ApplicationStatus status
    );
}
