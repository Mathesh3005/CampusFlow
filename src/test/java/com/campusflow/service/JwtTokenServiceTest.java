package com.campusflow.service;

import com.campusflow.entity.Role;
import com.campusflow.entity.User;
import com.campusflow.security.CustomUserPrincipal;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import com.nimbusds.jose.jwk.source.ImmutableSecret;

import javax.crypto.spec.SecretKeySpec;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenServiceTest {
    private static final byte[] KEY = "01234567890123456789012345678901".getBytes();

    @Test void generatedTokenHasUserIdSubjectRoleAndFifteenMinuteExpiry() {
        var key = new SecretKeySpec(KEY, "HmacSHA256");
        JwtEncoder encoder = new NimbusJwtEncoder(new ImmutableSecret<>(key));
        JwtTokenService service = new JwtTokenService(encoder);
        User user = new User("jwt@example.com", "hash", Role.STUDENT);
        try { var id = User.class.getDeclaredField("id"); id.setAccessible(true); id.set(user, 42L); }
        catch (ReflectiveOperationException ex) { throw new AssertionError(ex); }
        Instant before = Instant.now();
        var issued = service.issue(CustomUserPrincipal.from(user));
        var decoded = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build().decode(issued.value());
        assertEquals("42", decoded.getSubject());
        assertEquals("STUDENT", decoded.getClaimAsString("role"));
        assertTrue(decoded.getExpiresAt().isAfter(before.plusSeconds(14 * 60)));
        assertEquals(issued.expiresAt(), decoded.getExpiresAt());
    }

    @Test void expiredJwtIsRejectedByDecoder() {
        var key = new SecretKeySpec(KEY, "HmacSHA256");
        JwtEncoder encoder = new NimbusJwtEncoder(new ImmutableSecret<>(key));
        var claims = JwtClaimsSet.builder().subject("7").issuedAt(Instant.now().minusSeconds(120))
                .expiresAt(Instant.now().minusSeconds(60)).build();
        String expired = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        assertThrows(Exception.class, () -> NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build().decode(expired));
    }

}
