package com.campusflow.mapper;

import com.campusflow.dto.student.StudentRequestDto;
import com.campusflow.dto.student.StudentResponseDto;
import com.campusflow.entity.Student;

public class StudentMapper {

    private StudentMapper() {
        // Utility class
    }

    public static StudentResponseDto toResponseDto(Student student) {

        StudentResponseDto dto = new StudentResponseDto();

        dto.setId(student.getId());
        dto.setRegisterNumber(student.getRegisterNumber());
        dto.setFullName(student.getFullName());
        dto.setDepartment(student.getDepartment());
        dto.setGraduationYear(student.getGraduationYear());
        dto.setCgpa(student.getCgpa());
        dto.setPhone(student.getPhone());
        dto.setCreatedAt(student.getCreatedAt());
        dto.setUpdatedAt(student.getUpdatedAt());

        if (student.getUser() != null) {
            dto.setEmail(student.getUser().getEmail());
        }

        return dto;
    }

    public static void updateStudentFromDto(
            StudentRequestDto dto,
            Student student
    ) {
        student.setRegisterNumber(dto.getRegisterNumber());
        student.setFullName(dto.getFullName());
        student.setDepartment(dto.getDepartment());
        student.setGraduationYear(dto.getGraduationYear());
        student.setCgpa(dto.getCgpa());
        student.setPhone(dto.getPhone());
    }
}