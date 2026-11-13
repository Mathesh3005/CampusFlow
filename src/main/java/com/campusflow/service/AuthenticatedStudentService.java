package com.campusflow.service;

import com.campusflow.entity.Student;
import com.campusflow.repository.StudentRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthenticatedStudentService {
    private final StudentRepository students;
    public AuthenticatedStudentService(StudentRepository students) { this.students = students; }

    @Transactional(readOnly = true)
    public Student currentStudent(JwtAuthenticationToken authentication) {
        Long userId;
        try { userId = Long.valueOf(authentication.getToken().getSubject()); }
        catch (RuntimeException ex) { throw new AccessDeniedException("Invalid authenticated user"); }
        return students.findByUserId(userId)
                .orElseThrow(() -> new AccessDeniedException("No student profile for authenticated user"));
    }

    public void requireOwnership(JwtAuthenticationToken authentication, Long studentId) {
        if (!currentStudent(authentication).getId().equals(studentId))
            throw new AccessDeniedException("Student resource belongs to another user");
    }
}
