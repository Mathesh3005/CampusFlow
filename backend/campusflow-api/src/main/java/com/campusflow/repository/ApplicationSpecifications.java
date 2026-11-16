package com.campusflow.repository;

import com.campusflow.entity.Application;
import com.campusflow.entity.ApplicationStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public final class ApplicationSpecifications {

    private ApplicationSpecifications() {
    }

    public static Specification<Application> forOfficer(
            Long officerUserId,
            Long jobId,
            ApplicationStatus status,
            Long studentId) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("job").get("createdBy").get("user").get("id"), officerUserId));
            if (jobId != null) {
                predicates.add(cb.equal(root.get("job").get("id"), jobId));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (studentId != null) {
                predicates.add(cb.equal(root.get("student").get("id"), studentId));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
