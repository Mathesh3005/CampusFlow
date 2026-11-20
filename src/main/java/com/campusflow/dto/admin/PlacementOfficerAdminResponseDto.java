package com.campusflow.dto.admin;

import com.campusflow.entity.PlacementOfficer;

import java.time.OffsetDateTime;

public record PlacementOfficerAdminResponseDto(
        Long id,
        Long userId,
        String email,
        String employeeId,
        String fullName,
        String department,
        String phone,
        boolean active,
        OffsetDateTime createdAt) {

    public static PlacementOfficerAdminResponseDto from(PlacementOfficer officer) {
        return new PlacementOfficerAdminResponseDto(
                officer.getId(),
                officer.getUser().getId(),
                officer.getUser().getEmail(),
                officer.getEmployeeId(),
                officer.getFullName(),
                officer.getDepartment(),
                officer.getPhone(),
                Boolean.TRUE.equals(officer.getUser().getIsActive()),
                officer.getCreatedAt());
    }
}
