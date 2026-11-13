package com.campusflow.repository;

import com.campusflow.entity.PlacementOfficer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PlacementOfficerRepository
        extends JpaRepository<PlacementOfficer, Long> {

    Optional<PlacementOfficer> findByUserId(Long userId);

    boolean existsByUserId(Long userId);
}