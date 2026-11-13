package com.campusflow.security;

import com.campusflow.config.SecurityConfig;
import com.campusflow.controller.AuthController;
import com.campusflow.controller.HealthController;
import com.campusflow.dto.auth.AuthResponse;
import com.campusflow.dto.auth.LoginRequest;
import com.campusflow.dto.auth.RegisterStudentRequest;
import com.campusflow.entity.Role;
import com.campusflow.entity.Student;
import com.campusflow.entity.User;
import com.campusflow.repository.StudentRepository;
import com.campusflow.service.AuthService;
import com.campusflow.service.AuthenticatedStudentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.boot.security.autoconfigure.web.servlet.ServletWebSecurityAutoConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {AuthController.class, HealthController.class, SecurityTestEndpoints.class})
@Import({SecurityConfig.class, AuthenticatedStudentService.class})
@ImportAutoConfiguration(ServletWebSecurityAutoConfiguration.class)
@TestPropertySource(properties = "app.jwt.secret=MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=")
class SecurityHttpIntegrationTest {
    private static final Instant NOW = Instant.now();

    @Autowired MockMvc mvc;
    @MockitoBean AuthService authService;
    @MockitoBean JdbcTemplate jdbcTemplate;
    @MockitoBean JwtDecoder jwtDecoder;
    @MockitoBean UserDetailsServiceImpl userDetailsService;
    @MockitoBean StudentRepository studentRepository;

    @BeforeEach
    void configureDecoder() {
        when(jwtDecoder.decode("student-token")).thenReturn(jwt("student-token", "135", "STUDENT"));
        when(jwtDecoder.decode("admin-token")).thenReturn(jwt("admin-token", "246", "ADMIN"));
        when(jwtDecoder.decode("invalid-token")).thenThrow(new BadJwtException("invalid signature"));
    }

    @Test
    void healthIsPublic() throws Exception {
        when(jdbcTemplate.queryForObject(eq("SELECT 1"), eq(Integer.class))).thenReturn(1);
        mvc.perform(get("/api/v1/health")).andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("UP")));
    }

    @Test
    void registrationIsPublic() throws Exception {
        when(authService.register(org.mockito.ArgumentMatchers.any(RegisterStudentRequest.class)))
                .thenReturn(response(135L, "student@example.edu", "STUDENT"));
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"student@example.edu","password":"password123","registerNumber":"S-135","fullName":"Student One","department":"CS","graduationYear":2030}
                                """))
                .andExpect(status().isCreated());
    }

    @Test
    void loginIsPublic() throws Exception {
        when(authService.login(org.mockito.ArgumentMatchers.any(LoginRequest.class)))
                .thenReturn(response(135L, "student@example.edu", "STUDENT"));
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"student@example.edu\",\"password\":\"password123\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void protectedEndpointRejectsMissingAndInvalidJwt() throws Exception {
        mvc.perform(get("/api/v1/test/principal")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/test/principal").header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void validJwtAuthenticatesUserIdAndMapsRoleAuthority() throws Exception {
        mvc.perform(get("/api/v1/test/principal").header("Authorization", "Bearer student-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId", is("135")))
                .andExpect(jsonPath("$.authorities", contains("ROLE_STUDENT")));
    }

    @Test
    void insufficientRoleGetsForbiddenAndAdminRoleIsAccepted() throws Exception {
        mvc.perform(get("/api/v1/test/admin").header("Authorization", "Bearer student-token"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/test/admin").header("Authorization", "Bearer admin-token"))
                .andExpect(status().isOk());
    }

    @Test
    void studentOwnershipResolvesUsingAuthenticatedUserId() throws Exception {
        User user = new User("student@example.edu", "hash", Role.STUDENT);
        setId(user, 135L);
        Student student = new Student(user, "S-135", "Student One", "CS", 2030);
        setStudentId(student, 777L);
        when(studentRepository.findByUserId(135L)).thenReturn(java.util.Optional.of(student));

        mvc.perform(get("/api/v1/test/student/777").header("Authorization", "Bearer student-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authorized", is("true")));
        verify(studentRepository).findByUserId(135L);
        when(studentRepository.findByUserId(135L)).thenReturn(java.util.Optional.of(student));
        mvc.perform(get("/api/v1/test/student/999").header("Authorization", "Bearer student-token"))
                .andExpect(status().isForbidden());
    }

    private static Jwt jwt(String token, String subject, String role) {
        return Jwt.withTokenValue(token).header("alg", "HS256").subject(subject).claim("role", role)
                .issuedAt(NOW).expiresAt(NOW.plusSeconds(300)).build();
    }

    private static AuthResponse response(Long userId, String email, String role) {
        return new AuthResponse("test-access-token", "Bearer", NOW.plusSeconds(300), userId, email, role);
    }

    private static void setId(User user, Long id) {
        try {
            var field = User.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(user, id);
        } catch (ReflectiveOperationException exception) {
            throw new AssertionError(exception);
        }
    }

    private static void setStudentId(Student student, Long id) {
        try {
            var field = Student.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(student, id);
        } catch (ReflectiveOperationException exception) {
            throw new AssertionError(exception);
        }
    }

}
