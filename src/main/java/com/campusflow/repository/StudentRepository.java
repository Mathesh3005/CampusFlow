package com.campusflow.repository;

import com.campusflow.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.math.BigDecimal;
import java.util.List;

public interface StudentRepository extends JpaRepository<Student, Long> {

    Optional<Student> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    List<Student> findByCgpaGreaterThanEqual(BigDecimal cgpa);
}
