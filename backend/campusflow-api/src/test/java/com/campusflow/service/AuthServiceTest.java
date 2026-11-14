package com.campusflow.service;

import com.campusflow.dto.auth.LoginRequest;
import com.campusflow.dto.auth.RegisterStudentRequest;
import com.campusflow.entity.Role;
import com.campusflow.entity.Student;
import com.campusflow.entity.User;
import com.campusflow.repository.StudentRepository;
import com.campusflow.repository.UserRepository;
import com.campusflow.security.CustomUserPrincipal;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final StudentRepository students = mock(StudentRepository.class);
    private final PasswordEncoder encoder = new BCryptPasswordEncoder();
    private final AuthenticationManager manager = mock(AuthenticationManager.class);
    private final JwtTokenService tokens = mock(JwtTokenService.class);
    private final AuthService service = new AuthService(users, students, encoder, manager, tokens);

    @Test void passwordIsBcryptHashedAndRegistrationAlwaysUsesStudentRole() {
        when(users.existsByEmail("a@b.com")).thenReturn(false);
        when(users.save(any(User.class))).thenAnswer(call -> {
            User u = call.getArgument(0);
            assertEquals(Role.STUDENT, u.getRole());
            assertTrue(encoder.matches("password123", u.getPasswordHash()));
            assertNotEquals("password123", u.getPasswordHash());
            setId(u, 12L);
            return u;
        });
        when(tokens.issue(any())).thenReturn(new JwtTokenService.Token("token", Instant.now().plusSeconds(60)));
        var result = service.register(new RegisterStudentRequest("A@B.com", "password123", "R1", "Student", "CS", 2030));
        assertEquals(12L, result.userId());
        verify(students).save(any(Student.class));
    }

    @Test void successfulLoginIssuesAccessToken() {
        User user = user(1L, true);
        var principal = CustomUserPrincipal.from(user);
        Authentication authenticated = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        when(manager.authenticate(any())).thenReturn(authenticated);
        when(tokens.issue(principal)).thenReturn(new JwtTokenService.Token("access", Instant.now().plusSeconds(10)));
        assertEquals("access", service.login(new LoginRequest("s@example.com", "password123")).accessToken());
    }

    @Test void failedLoginIsRejected() {
        when(manager.authenticate(any())).thenThrow(new org.springframework.security.authentication.BadCredentialsException("bad"));
        assertThrows(org.springframework.security.authentication.BadCredentialsException.class,
                () -> service.login(new LoginRequest("s@example.com", "wrong")));
    }

    @Test void inactiveAccountIsRejected() {
        User user = user(1L, false);
        var principal = CustomUserPrincipal.from(user);
        Authentication authenticated = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        when(manager.authenticate(any())).thenReturn(authenticated);
        assertThrows(DisabledException.class, () -> service.login(new LoginRequest("s@example.com", "password123")));
        verify(tokens, never()).issue(any());
    }

    @Test void roleMapsToSpringRoleAuthority() {
        assertEquals("ROLE_STUDENT", CustomUserPrincipal.from(user(1L, true)).getAuthorities().iterator().next().getAuthority());
    }

    private static User user(Long id, boolean active) {
        User u = new User("s@example.com", "encoded", Role.STUDENT); setId(u, id); u.setIsActive(active); return u;
    }
    private static void setId(User user, Long id) {
        try { var field = User.class.getDeclaredField("id"); field.setAccessible(true); field.set(user, id); }
        catch (ReflectiveOperationException ex) { throw new AssertionError(ex); }
    }
}
