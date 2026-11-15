package com.campusflow.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.campusflow.dto.dashboard.OfficerDashboardResponseDto;
import com.campusflow.entity.PlacementOfficer;
import com.campusflow.service.AuthenticatedPlacementOfficerService;
import com.campusflow.service.OfficerDashboardService;

@RestController
@RequestMapping("/api/v1/officer/dashboard")
public class OfficerDashboardController {

    private final OfficerDashboardService dashboardService;
    private final AuthenticatedPlacementOfficerService authenticatedOfficerService;

    public OfficerDashboardController(
            OfficerDashboardService dashboardService,
            AuthenticatedPlacementOfficerService authenticatedOfficerService) {
        this.dashboardService = dashboardService;
        this.authenticatedOfficerService = authenticatedOfficerService;
    }

    @GetMapping
    @PreAuthorize("hasRole('PLACEMENT_OFFICER')")
    public OfficerDashboardResponseDto getDashboard(
            JwtAuthenticationToken jwt) {

        if (jwt == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication required");
        }

        PlacementOfficer officer =
                authenticatedOfficerService.currentOfficer(jwt);

        return dashboardService.getDashboard(officer);
    }
}
