package com.campusflow.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.campusflow.dto.response.PlacementTrendResponseDto;
import com.campusflow.entity.PlacementOfficer;
import com.campusflow.service.AuthenticatedPlacementOfficerService;
import com.campusflow.service.PlacementTrendAnalyticsService;

@RestController
@RequestMapping("/api/v1/officer/analytics")
public class PlacementTrendAnalyticsController {

    private final PlacementTrendAnalyticsService analyticsService;
    private final AuthenticatedPlacementOfficerService authenticatedOfficerService;

    public PlacementTrendAnalyticsController(
            PlacementTrendAnalyticsService analyticsService,
            AuthenticatedPlacementOfficerService authenticatedOfficerService) {
        this.analyticsService = analyticsService;
        this.authenticatedOfficerService = authenticatedOfficerService;
    }

    @GetMapping("/placement-trends")
    @PreAuthorize("hasRole('PLACEMENT_OFFICER')")
    public List<PlacementTrendResponseDto> getPlacementTrends(
            JwtAuthenticationToken jwt) {

        PlacementOfficer officer =
                authenticatedOfficerService.currentOfficer(jwt);

        return analyticsService.getPlacementTrends(officer);
    }
}