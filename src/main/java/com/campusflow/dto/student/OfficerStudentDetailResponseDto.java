package com.campusflow.dto.student;

import com.campusflow.dto.project.ProjectResponseDto;
import com.campusflow.dto.studentskill.StudentSkillResponseDto;

import java.util.List;

public record OfficerStudentDetailResponseDto(
        StudentResponseDto student,
        List<StudentSkillResponseDto> skills,
        List<ProjectResponseDto> projects,
        List<OfficerStudentApplicationSummaryDto> applications) {
}
