package com.campusflow.service;

import com.campusflow.dto.project.ProjectResponseDto;
import com.campusflow.dto.student.OfficerStudentApplicationSummaryDto;
import com.campusflow.dto.student.OfficerStudentDetailResponseDto;
import com.campusflow.dto.student.StudentResponseDto;
import com.campusflow.dto.studentskill.StudentSkillResponseDto;
import com.campusflow.entity.Student;
import com.campusflow.entity.StudentSkill;
import com.campusflow.mapper.ProjectMapper;
import com.campusflow.mapper.StudentMapper;
import com.campusflow.repository.ApplicationRepository;
import com.campusflow.repository.ProjectRepository;
import com.campusflow.repository.StudentRepository;
import com.campusflow.repository.StudentSkillRepository;
import com.campusflow.repository.StudentSpecifications;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;

@Service
public class OfficerStudentService {

    private final StudentRepository students;
    private final StudentSkillRepository studentSkills;
    private final ProjectRepository projects;
    private final ApplicationRepository applications;

    public OfficerStudentService(
            StudentRepository students,
            StudentSkillRepository studentSkills,
            ProjectRepository projects,
            ApplicationRepository applications) {
        this.students = students;
        this.studentSkills = studentSkills;
        this.projects = projects;
        this.applications = applications;
    }

    @Transactional(readOnly = true)
    public Page<StudentResponseDto> listStudents(
            String search,
            String department,
            Integer graduationYear,
            Pageable pageable) {
        return students.findAll(StudentSpecifications.matches(search, department, graduationYear), pageable)
                .map(StudentMapper::toResponseDto);
    }

    @Transactional(readOnly = true)
    public OfficerStudentDetailResponseDto getStudent(Long studentId) {
        Student student = students.findById(studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));

        List<StudentSkillResponseDto> skills = studentSkills.findByStudentId(studentId).stream()
                .map(OfficerStudentService::toSkillResponse)
                .toList();
        List<ProjectResponseDto> studentProjects = projects.findByStudentId(studentId).stream()
                .map(ProjectMapper::toResponseDto)
                .toList();
        List<OfficerStudentApplicationSummaryDto> applicationSummaries = applications.findByStudentId(studentId).stream()
                .sorted(Comparator.comparing(application -> application.getAppliedAt(),
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(OfficerStudentApplicationSummaryDto::from)
                .toList();

        return new OfficerStudentDetailResponseDto(
                StudentMapper.toResponseDto(student),
                skills,
                studentProjects,
                applicationSummaries);
    }

    private static StudentSkillResponseDto toSkillResponse(StudentSkill studentSkill) {
        StudentSkillResponseDto response = new StudentSkillResponseDto();
        response.setSkillId(studentSkill.getSkill().getId());
        response.setSkillName(studentSkill.getSkill().getName());
        response.setProficiencyLevel(studentSkill.getProficiencyLevel());
        response.setCreatedAt(studentSkill.getCreatedAt());
        return response;
    }
}
