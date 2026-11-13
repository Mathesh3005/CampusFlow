package com.campusflow.mapper;

import com.campusflow.dto.placementofficer.PlacementOfficerRequestDto;
import com.campusflow.dto.placementofficer.PlacementOfficerResponseDto;
import com.campusflow.entity.PlacementOfficer;

public class PlacementOfficerMapper {

    private PlacementOfficerMapper() {
    }

    public static PlacementOfficerResponseDto toResponseDto(
            PlacementOfficer officer) {

        if (officer == null) {
            return null;
        }

        PlacementOfficerResponseDto dto =
                new PlacementOfficerResponseDto();

        dto.setId(officer.getId());
        dto.setEmployeeId(officer.getEmployeeId());
        dto.setFullName(officer.getFullName());
        dto.setDepartment(officer.getDepartment());
        dto.setPhone(officer.getPhone());
        dto.setEmail(officer.getUser().getEmail());
        dto.setCreatedAt(officer.getCreatedAt());
        dto.setUpdatedAt(officer.getUpdatedAt());

        return dto;
    }

    public static void updateOfficerFromDto(
            PlacementOfficerRequestDto dto,
            PlacementOfficer officer) {

        officer.setEmployeeId(dto.getEmployeeId());
        officer.setFullName(dto.getFullName());
        officer.setDepartment(dto.getDepartment());
        officer.setPhone(dto.getPhone());
    }
}