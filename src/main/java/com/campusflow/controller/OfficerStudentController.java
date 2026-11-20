package com.campusflow.controller;

import com.campusflow.dto.common.PageResponseDto;
import com.campusflow.dto.student.OfficerStudentDetailResponseDto;
import com.campusflow.dto.student.StudentResponseDto;
import com.campusflow.service.OfficerStudentService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;

@RestController
@RequestMapping("/api/v1/officer/students")
@PreAuthorize("hasRole('PLACEMENT_OFFICER')")
public class OfficerStudentController {

    private static final Set<String> SORTABLE_FIELDS = Set.of(
            "fullName", "registerNumber", "department", "graduationYear", "cgpa", "createdAt", "updatedAt");

    private final OfficerStudentService students;

    public OfficerStudentController(OfficerStudentService students) {
        this.students = students;
    }

    @GetMapping
    public PageResponseDto<StudentResponseDto> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) Integer graduationYear,
            @PageableDefault(size = 20, sort = "fullName", direction = Sort.Direction.ASC) Pageable pageable) {
        validateSort(pageable);
        return PageResponseDto.from(students.listStudents(search, department, graduationYear, pageable));
    }

    @GetMapping("/{id}")
    public OfficerStudentDetailResponseDto get(@PathVariable Long id) {
        return students.getStudent(id);
    }

    private static void validateSort(Pageable pageable) {
        for (Sort.Order order : pageable.getSort()) {
            if (!SORTABLE_FIELDS.contains(order.getProperty())) {
                throw new IllegalArgumentException("Unsupported student sort field: " + order.getProperty());
            }
        }
    }
}
