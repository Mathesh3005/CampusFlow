package com.campusflow.controller;

import com.campusflow.dto.auth.ChangePasswordRequest;
import com.campusflow.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/account")
public class AccountController {

    private final AuthService authService;

    public AccountController(AuthService authService) {
        this.authService = authService;
    }

    @PutMapping("/password")
    public ResponseEntity<Void> changePassword(Authentication authentication,
                                               @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(currentUserId(authentication), request.currentPassword(), request.newPassword());
        return ResponseEntity.noContent().build();
    }

    private Long currentUserId(Authentication authentication) {
        if (!(authentication instanceof JwtAuthenticationToken jwt)) {
            throw new AccessDeniedException("A JWT-authenticated account is required");
        }
        try {
            return Long.valueOf(jwt.getToken().getSubject());
        } catch (RuntimeException ex) {
            throw new AccessDeniedException("Invalid authenticated user");
        }
    }
}
