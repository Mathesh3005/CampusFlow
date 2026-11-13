package com.campusflow.service;

import com.campusflow.entity.Project;
import com.campusflow.entity.Student;
import com.campusflow.repository.ProjectRepository;
import com.campusflow.repository.StudentRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final StudentRepository studentRepository;

    public ProjectService(
            ProjectRepository projectRepository,
            StudentRepository studentRepository) {

        this.projectRepository = projectRepository;
        this.studentRepository = studentRepository;
    }

    // Create a student project
    public Project createProject(
            Long studentId,
            String title,
            String description) {

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Project title is required");
        }

        Project project = new Project(
                student,
                title.trim(),
                description
        );

        return projectRepository.save(project);
    }

    // Get project by ID
    @Transactional(readOnly = true)
    public Project getProjectById(Long projectId) {

        return projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));
    }

    // Get all projects belonging to a student
    @Transactional(readOnly = true)
    public List<Project> getProjectsByStudent(Long studentId) {

        if (!studentRepository.existsById(studentId)) {
            throw new RuntimeException("Student not found");
        }

        return projectRepository.findByStudentId(studentId);
    }

    // Update project details
    public Project updateProject(
            Long projectId,
            Long studentId,
            String title,
            String description,
            String githubUrl,
            String liveDemoUrl,
            LocalDate startDate,
            LocalDate endDate) {

        Project project = projectRepository
                .findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        if (!project.getStudent().getId().equals(studentId)) {
            throw new RuntimeException(
                    "You cannot update another student's project");
        }

        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Project title is required");
        }

        if (startDate != null && endDate != null &&
                endDate.isBefore(startDate)) {
            throw new IllegalArgumentException(
                    "Project end date cannot be before start date");
        }

        project.setTitle(title.trim());
        project.setDescription(description);
        project.setGithubUrl(githubUrl);
        project.setLiveDemoUrl(liveDemoUrl);
        project.setStartDate(startDate);
        project.setEndDate(endDate);

        return projectRepository.save(project);
    }

    // Delete a student project
    public void deleteProject(Long projectId, Long studentId) {

        Project project = projectRepository
                .findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        if (!project.getStudent().getId().equals(studentId)) {
            throw new RuntimeException(
                    "You cannot delete another student's project");
        }

        projectRepository.delete(project);
    }
}