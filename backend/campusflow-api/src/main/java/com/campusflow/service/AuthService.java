package com.campusflow.service;

import com.campusflow.dto.auth.AuthResponse;
import com.campusflow.dto.auth.LoginRequest;
import com.campusflow.dto.auth.RegisterStudentRequest;
import com.campusflow.entity.Role;
import com.campusflow.entity.Student;
import com.campusflow.entity.User;
import com.campusflow.repository.StudentRepository;
import com.campusflow.repository.UserRepository;
import com.campusflow.security.CustomUserPrincipal;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class AuthService {
    private final UserRepository users;
    private final StudentRepository students;
    private final PasswordEncoder passwords;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenService tokens;

    public AuthService(UserRepository users, StudentRepository students, PasswordEncoder passwords,
                       AuthenticationManager authenticationManager, JwtTokenService tokens) {
        this.users = users; this.students = students; this.passwords = passwords;
        this.authenticationManager = authenticationManager; this.tokens = tokens;
    }

    @Transactional
    public AuthResponse register(RegisterStudentRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmail(email)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        User user = users.save(new User(email, passwords.encode(request.password()), Role.STUDENT));
        Student student = new Student(user, request.registerNumber().trim(), request.fullName().trim(),
                request.department().trim(), request.graduationYear());
        students.save(student);
        return response(CustomUserPrincipal.from(user));
    }

    public AuthResponse login(LoginRequest request) {
        Authentication auth;
        try {
            auth = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(
                    request.email().trim().toLowerCase(Locale.ROOT), request.password()));
        } catch (AuthenticationException ex) {
            throw new BadCredentialsException("Invalid email or password");
        }
        return response((CustomUserPrincipal) auth.getPrincipal());
    }

    private AuthResponse response(CustomUserPrincipal principal) {
        if (!principal.active()) throw new DisabledException("Account is disabled");
        var token = tokens.issue(principal);
        return new AuthResponse(token.value(), "Bearer", token.expiresAt(), principal.id(), principal.email(), principal.role());
    }
}
