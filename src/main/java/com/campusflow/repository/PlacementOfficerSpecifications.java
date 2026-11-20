package com.campusflow.repository;

import com.campusflow.entity.PlacementOfficer;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public final class PlacementOfficerSpecifications {

    private PlacementOfficerSpecifications() {
    }

    public static Specification<PlacementOfficer> matchesSearch(String search) {
        return (root, query, cb) -> {
            if (search == null || search.isBlank()) {
                return cb.conjunction();
            }
            String pattern = "%" + search.trim().toLowerCase() + "%";
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.like(cb.lower(root.get("fullName")), pattern));
            predicates.add(cb.like(cb.lower(root.get("employeeId")), pattern));
            predicates.add(cb.like(cb.lower(cb.coalesce(root.get("department"), "")), pattern));
            predicates.add(cb.like(cb.lower(root.get("user").get("email")), pattern));
            return cb.or(predicates.toArray(Predicate[]::new));
        };
    }
}
