package com.campusflow.repository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import com.campusflow.entity.EmploymentType;
import com.campusflow.entity.Job;
import com.campusflow.entity.JobStatus;
import com.campusflow.entity.WorkMode;

import jakarta.persistence.criteria.Predicate;

public final class JobSpecifications {

    private JobSpecifications() {
    }

    public static Specification<Job> publishedForStudent(
            String location,
            EmploymentType employmentType,
            WorkMode workMode,
            BigDecimal studentCgpa) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), JobStatus.PUBLISHED));

            if (hasText(location)) {
                predicates.add(cb.like(cb.lower(root.get("location")), "%" + location.trim().toLowerCase() + "%"));
            }
            if (employmentType != null) {
                predicates.add(cb.equal(root.get("employmentType"), employmentType));
            }
            if (workMode != null) {
                predicates.add(cb.equal(root.get("workMode"), workMode));
            }
           
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
