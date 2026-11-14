package com.campusflow.repository;

import com.campusflow.entity.Job;
import com.campusflow.entity.JobStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.campusflow.entity.EmploymentType;
import com.campusflow.entity.WorkMode;

public interface JobRepository extends JpaRepository<Job, Long> {

    List<Job> findByStatus(JobStatus status);

    boolean existsByStatus(JobStatus status);

    @Query("""
            select j from Job j
            where (:status is null or j.status = :status)
              and (:location is null or lower(j.location) like lower(concat('%', :location, '%')))
              and (:employmentType is null or j.employmentType = :employmentType)
              and (:workMode is null or j.workMode = :workMode)
              and ((:minimumCgpa is null and j.minimumCgpa is null)
                   or (:minimumCgpa is not null and (j.minimumCgpa is null or j.minimumCgpa <= :minimumCgpa)))
            """)
    Page<Job> search(@Param("status") JobStatus status,
                     @Param("location") String location,
                     @Param("employmentType") EmploymentType employmentType,
                     @Param("workMode") WorkMode workMode,
                     @Param("minimumCgpa") java.math.BigDecimal minimumCgpa,
                     Pageable pageable);

    Page<Job> findByCreatedByUserId(Long userId, Pageable pageable);
}
