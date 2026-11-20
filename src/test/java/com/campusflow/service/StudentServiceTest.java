package com.campusflow.service;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campusflow.dto.student.StudentProfileUpdateRequest;
import com.campusflow.entity.Role;
import com.campusflow.entity.Student;
import com.campusflow.entity.User;
import com.campusflow.repository.StudentRepository;
import com.campusflow.repository.UserRepository;

class StudentServiceTest {
    @Test
    void profileUpdateChangesOnlyStudentEditableFields() {
        StudentRepository students = mock(StudentRepository.class);
        UserRepository users = mock(UserRepository.class);
        StudentService service = new StudentService(students, users);
        Student student = new Student(new User("student@example.edu", "hash", Role.STUDENT),
                "REG-1", "Old Name", "Old Department", 2027);
        when(students.save(student)).thenReturn(student);
        when(students.findByUserId(student.getUser().getId()))
        .thenReturn(Optional.of(student));
        StudentProfileUpdateRequest update = new StudentProfileUpdateRequest(
                "  New Name  ", "  Engineering  ", 2028, new BigDecimal("8.50"), " 5550100 ");

        Student result = service.updateProfile(student, update);

        assertEquals(student, result);
        assertEquals("REG-1", student.getRegisterNumber());
        assertEquals("New Name", student.getFullName());
        assertEquals("Engineering", student.getDepartment());
        assertEquals(2028, student.getGraduationYear());
        assertEquals(new BigDecimal("8.50"), student.getCgpa());
        assertEquals("5550100", student.getPhone());
        verify(students).save(student);
    }
}
