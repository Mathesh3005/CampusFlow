package com.campusflow.service;

import com.campusflow.entity.PlacementOfficer;
import com.campusflow.repository.PlacementOfficerRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthenticatedPlacementOfficerService {
    private final PlacementOfficerRepository officers;

    public AuthenticatedPlacementOfficerService(PlacementOfficerRepository officers) {
        this.officers = officers;
    }

    @Transactional(readOnly = true)
    public PlacementOfficer currentOfficer(JwtAuthenticationToken authentication) {
        try {
            Long userId = Long.valueOf(authentication.getToken().getSubject());
            return officers.findByUserId(userId).orElseThrow(
                    () -> new AccessDeniedException("No placement officer profile for authenticated user"));
        } catch (NumberFormatException ex) {
            throw new AccessDeniedException("Invalid authenticated user");
        }
    }
}
