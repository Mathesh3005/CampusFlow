package com.campusflow.service;

import com.campusflow.security.CustomUserPrincipal;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class JwtTokenService {
    public static final Duration ACCESS_TOKEN_TTL = Duration.ofMinutes(15);
    private final JwtEncoder encoder;
    public JwtTokenService(JwtEncoder encoder) { this.encoder = encoder; }

    public Token issue(CustomUserPrincipal principal) {
        Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        Instant expires = now.plus(ACCESS_TOKEN_TTL);
        var claims = JwtClaimsSet.builder().issuer("campusflow-api").issuedAt(now).expiresAt(expires)
                .subject(principal.id().toString()).claim("email", principal.email())
                .claim("role", principal.role()).build();
        var header = JwsHeader.with(MacAlgorithm.HS256).build();
        return new Token(encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue(), expires);
    }
    public record Token(String value, Instant expiresAt) { }
}
