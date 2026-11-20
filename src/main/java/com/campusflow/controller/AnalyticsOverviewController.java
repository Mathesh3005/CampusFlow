package com.campusflow.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.campusflow.dto.analytics.AnalyticsOverviewResponseDto;
import com.campusflow.entity.PlacementOfficer;
import com.campusflow.service.AnalyticsOverviewService;
import com.campusflow.service.AuthenticatedPlacementOfficerService;

@RestController
@RequestMapping("/api/v1/officer/analytics")
public class AnalyticsOverviewController {

    private final AnalyticsOverviewService analyticsService;
    private final AuthenticatedPlacementOfficerService authenticatedOfficerService;

    public AnalyticsOverviewController(
            AnalyticsOverviewService analyticsService,
            AuthenticatedPlacementOfficerService authenticatedOfficerService) {
        this.analyticsService = analyticsService;
        this.authenticatedOfficerService = authenticatedOfficerService;
    }

    @GetMapping("/overview")
    @PreAuthorize("hasRole('PLACEMENT_OFFICER')")
    public AnalyticsOverviewResponseDto getOverview(
            JwtAuthenticationToken jwt) {

        PlacementOfficer officer =
                authenticatedOfficerService.currentOfficer(jwt);

        return analyticsService.getOverview(officer);
    }
}