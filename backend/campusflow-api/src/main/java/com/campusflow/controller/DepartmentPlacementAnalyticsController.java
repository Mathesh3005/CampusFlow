package com.campusflow.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.campusflow.dto.analytics.DepartmentPlacementResponseDto;
import com.campusflow.entity.PlacementOfficer;
import com.campusflow.service.AuthenticatedPlacementOfficerService;
import com.campusflow.service.DepartmentPlacementAnalyticsService;

@RestController
@RequestMapping("/api/v1/officer/analytics")
public class DepartmentPlacementAnalyticsController {

    private final DepartmentPlacementAnalyticsService analyticsService;
    private final AuthenticatedPlacementOfficerService authenticatedOfficerService;

    public DepartmentPlacementAnalyticsController(
            DepartmentPlacementAnalyticsService analyticsService,
            AuthenticatedPlacementOfficerService authenticatedOfficerService) {
        this.analyticsService = analyticsService;
        this.authenticatedOfficerService = authenticatedOfficerService;
    }

@GetMapping("/top-departments")
@PreAuthorize("hasRole('PLACEMENT_OFFICER')")
public List<DepartmentPlacementResponseDto> getTopPerformingDepartments(
        JwtAuthenticationToken jwt) {

    PlacementOfficer officer =
            authenticatedOfficerService.currentOfficer(jwt);

    return analyticsService.getTopPerformingDepartments(officer);
}

    @GetMapping("/placements")
    @PreAuthorize("hasRole('PLACEMENT_OFFICER')")
    public List<DepartmentPlacementResponseDto> getDepartmentPlacements(
            JwtAuthenticationToken jwt) {

        PlacementOfficer officer =
                authenticatedOfficerService.currentOfficer(jwt);

        return analyticsService.getDepartmentPlacements(officer);
    }
}