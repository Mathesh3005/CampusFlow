package com.campusflow.repository;

import com.campusflow.entity.Student;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public final class StudentSpecifications {

    private StudentSpecifications() {
    }

    public static Specification<Student> matches(String search, String department, Integer graduationYear) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("fullName")), pattern),
                        cb.like(cb.lower(root.get("registerNumber")), pattern),
                        cb.like(cb.lower(root.get("department")), pattern),
                        cb.like(cb.lower(root.get("user").get("email")), pattern)));
            }
            if (department != null && !department.isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("department")), department.trim().toLowerCase()));
            }
            if (graduationYear != null) {
                predicates.add(cb.equal(root.get("graduationYear"), graduationYear));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
