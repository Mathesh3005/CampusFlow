package com.campusflow.repository;

import com.campusflow.entity.Interview;
import com.campusflow.entity.InterviewStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;

public interface InterviewRepository
        extends JpaRepository<Interview, Long> {

    List<Interview> findByApplicationId(Long applicationId);

    List<Interview> findByStatus(InterviewStatus status);

    @EntityGraph(attributePaths = {"application", "application.student", "application.job"})
    Page<Interview> findByApplication_Student_Id(Long studentId, Pageable pageable);

    @EntityGraph(attributePaths = {"application", "application.student", "application.job"})
    Optional<Interview> findByIdAndApplication_Student_Id(Long interviewId, Long studentId);

    @EntityGraph(attributePaths = {"application", "application.student", "application.job"})
    Page<Interview> findByApplication_Job_CreatedBy_User_Id(Long userId, Pageable pageable);

    @EntityGraph(attributePaths = {"application", "application.student", "application.job"})
    Optional<Interview> findByIdAndApplication_Job_CreatedBy_User_Id(Long interviewId, Long userId);
}
