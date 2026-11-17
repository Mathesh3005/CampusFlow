package com.campusflow.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.repository.query.Param;

import com.campusflow.entity.Application;
import com.campusflow.entity.ApplicationStatus;

public interface ApplicationRepository
        extends JpaRepository<Application, Long>, JpaSpecificationExecutor<Application> {

    @Override
    @EntityGraph(attributePaths = {"student", "job", "resume"})
    Page<Application> findAll(Specification<Application> specification, Pageable pageable);

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
    """)
    long countDistinctStudentsByOfficer(@Param("userId") Long userId);

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

    @Query("""
    SELECT
        a.student.department,
        COUNT(a),
        COUNT(CASE
            WHEN a.status = :shortlisted THEN 1
        END),
        COUNT(CASE
            WHEN a.status = :selected THEN 1
        END)
    FROM Application a
    WHERE a.job.createdBy.user.id = :userId
    GROUP BY a.student.department
    ORDER BY a.student.department
    """)
    List<Object[]> getDepartmentPlacementStatistics(
            @Param("userId") Long userId,
            @Param("shortlisted") ApplicationStatus shortlisted,
            @Param("selected") ApplicationStatus selected
    );

    @Query("""
    SELECT
        a.student.graduationYear,
        COUNT(a),
        COUNT(CASE
            WHEN a.status = :selected THEN 1
        END)
    FROM Application a
    WHERE a.job.createdBy.user.id = :userId
    GROUP BY a.student.graduationYear
    ORDER BY a.student.graduationYear
    """)
List<Object[]> getPlacementTrendsByGraduationYear(
    @Param("userId") Long userId,
    @Param("selected") ApplicationStatus selected
);
}
