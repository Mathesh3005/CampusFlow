package com.campusflow.repository;

import com.campusflow.entity.PlacementOfficer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface PlacementOfficerRepository
        extends JpaRepository<PlacementOfficer, Long>, JpaSpecificationExecutor<PlacementOfficer> {

    Optional<PlacementOfficer> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    boolean existsByEmployeeId(String employeeId);

    long countByUser_IsActiveTrue();
}