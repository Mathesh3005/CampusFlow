package com.campusflow.service;

import com.campusflow.entity.Student;
import com.campusflow.entity.User;
import com.campusflow.repository.StudentRepository;
import com.campusflow.repository.UserRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class StudentService {

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;

    public StudentService(
            StudentRepository studentRepository,
            UserRepository userRepository) {
        this.studentRepository = studentRepository;
        this.userRepository = userRepository;
    }

    public Student createStudent(Student student) {

        if (student == null) {
            throw new IllegalArgumentException("Student cannot be null");
        }

        if (student.getUser() == null || student.getUser().getId() == null) {
            throw new IllegalArgumentException(
                    "A valid user account is required");
        }

        Long userId = student.getUser().getId();

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new IllegalArgumentException("User not found"));

        if (studentRepository.existsByUserId(userId)) {
            throw new IllegalArgumentException(
                    "Student profile already exists for this user");
        }

        student.setUser(user);

        return studentRepository.save(student);
    }

    @Transactional(readOnly = true)
    public Optional<Student> getStudentById(Long studentId) {
        return studentRepository.findById(studentId);
    }

    @Transactional(readOnly = true)
    public Optional<Student> getStudentByUserId(Long userId) {
        return studentRepository.findByUserId(userId);
    }

    @Transactional(readOnly = true)
    public List<Student> getAllStudents() {
        return studentRepository.findAll();
    }

    public Student updateStudent(Long studentId, Student updatedStudent) {

        if (updatedStudent == null) {
            throw new IllegalArgumentException(
                    "Updated student details cannot be null");
        }

        Student existingStudent = studentRepository.findById(studentId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Student not found"));

        existingStudent.setRegisterNumber(
                updatedStudent.getRegisterNumber());

        existingStudent.setFullName(updatedStudent.getFullName());

        existingStudent.setDepartment(updatedStudent.getDepartment());

        existingStudent.setGraduationYear(
                updatedStudent.getGraduationYear());

        existingStudent.setCgpa(updatedStudent.getCgpa());

        existingStudent.setPhone(updatedStudent.getPhone());

        return studentRepository.save(existingStudent);
    }

    public void deleteStudent(Long studentId) {

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Student not found"));

        studentRepository.delete(student);
    }
}