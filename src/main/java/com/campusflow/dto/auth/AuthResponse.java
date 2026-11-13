package com.campusflow.dto.auth;

import java.time.Instant;

public record AuthResponse(String accessToken, String tokenType, Instant expiresAt, Long userId, String email, String role) { }
