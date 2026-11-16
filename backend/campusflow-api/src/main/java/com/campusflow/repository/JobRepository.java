package com.campusflow.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.campusflow.entity.Job;
import com.campusflow.entity.JobStatus;

public interface JobRepository extends JpaRepository<Job, Long>, JpaSpecificationExecutor<Job> {

    List<Job> findByStatus(JobStatus status);

    boolean existsByStatus(JobStatus status);

    long countByStatus(JobStatus status);

    long countByCreatedBy_Id(Long officerId);

    long countByCreatedBy_IdAndStatus(Long officerId, JobStatus status);

    Page<Job> findByCreatedByUserId(Long userId, Pageable pageable);
}
