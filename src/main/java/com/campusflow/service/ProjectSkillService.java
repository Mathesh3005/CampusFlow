package com.campusflow.service;

import com.campusflow.entity.*;
import com.campusflow.repository.*;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class ProjectSkillService {

    private final ProjectSkillRepository projectSkillRepository;
    private final ProjectRepository projectRepository;
    private final SkillRepository skillRepository;

    public ProjectSkillService(
            ProjectSkillRepository projectSkillRepository,
            ProjectRepository projectRepository,
            SkillRepository skillRepository) {

        this.projectSkillRepository = projectSkillRepository;
        this.projectRepository = projectRepository;
        this.skillRepository = skillRepository;
    }

    // Add a skill to a student project
    public ProjectSkill addSkillToProject(
            Long projectId,
            Long skillId,
            Long studentId) {

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        if (!project.getStudent().getId().equals(studentId)) {
            throw new AccessDeniedException("You cannot modify another student's project");
        }

        Skill skill = skillRepository.findById(skillId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Skill not found"));

        if (projectSkillRepository.existsByProjectIdAndSkillId(
                projectId, skillId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This skill is already assigned to the project");
        }

        ProjectSkill projectSkill = new ProjectSkill(project, skill);

        return projectSkillRepository.save(projectSkill);
    }

    // Get all skills associated with a project
    @Transactional(readOnly = true)
    public List<ProjectSkill> getProjectSkills(Long projectId, Long studentId) {

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        if (!project.getStudent().getId().equals(studentId)) {
            throw new AccessDeniedException("You cannot view another student's project technologies");
        }

        return projectSkillRepository.findByProjectId(projectId);
    }

    // Get all projects associated with a particular skill
    @Transactional(readOnly = true)
    public List<ProjectSkill> getProjectsBySkill(Long skillId) {

        if (!skillRepository.existsById(skillId)) {
            throw new RuntimeException("Skill not found");
        }

        return projectSkillRepository.findBySkillId(skillId);
    }

    // Remove a skill from a project
    public void removeSkillFromProject(
            Long projectId,
            Long skillId,
            Long studentId) {

        ProjectSkill projectSkill = projectSkillRepository
                .findById(new ProjectSkillId(projectId, skillId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Project skill relationship not found"));

        if (!projectSkill.getProject().getStudent().getId().equals(studentId)) {
            throw new AccessDeniedException("You cannot modify another student's project");
        }

        projectSkillRepository.delete(projectSkill);
    }
}
