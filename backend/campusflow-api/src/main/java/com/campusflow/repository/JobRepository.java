package com.campusflow.repository;

import com.campusflow.entity.Job;
import com.campusflow.entity.JobStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JobRepository extends JpaRepository<Job, Long> {

    List<Job> findByStatus(JobStatus status);

    boolean existsByStatus(JobStatus status);
}