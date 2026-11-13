package com.campusflow.security;

import com.campusflow.service.AuthenticatedStudentService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class SecurityTestEndpoints {
    private final AuthenticatedStudentService students;
    public SecurityTestEndpoints(AuthenticatedStudentService students) { this.students = students; }

    @GetMapping("/api/v1/test/principal")
    public Map<String, Object> principal(Authentication authentication) {
        return Map.of("userId", authentication.getName(), "authorities",
                authentication.getAuthorities().stream().map(a -> a.getAuthority()).toList());
    }

    @GetMapping("/api/v1/test/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, String> admin() { return Map.of("access", "allowed"); }

    @GetMapping("/api/v1/test/student/{studentId}")
    public Map<String, String> student(Authentication authentication, @PathVariable Long studentId) {
        students.requireOwnership((JwtAuthenticationToken) authentication, studentId);
        return Map.of("authorized", "true");
    }
}
