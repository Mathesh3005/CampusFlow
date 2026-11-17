package com.campusflow.repository;

import com.campusflow.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.EntityGraph;

import java.util.Optional;
import java.math.BigDecimal;
import java.util.List;

public interface StudentRepository extends JpaRepository<Student, Long>, JpaSpecificationExecutor<Student> {

    @EntityGraph(attributePaths = "user")
    Optional<Student> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    boolean existsByRegisterNumber(String registerNumber);

    List<Student> findByCgpaGreaterThanEqual(BigDecimal cgpa);
}
