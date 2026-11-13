package com.campusflow.service;

import com.campusflow.entity.*;
import com.campusflow.repository.*;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class SkillService {

    private final SkillRepository skillRepository;
    private final StudentRepository studentRepository;
    private final StudentSkillRepository studentSkillRepository;

    public SkillService(
            SkillRepository skillRepository,
            StudentRepository studentRepository,
            StudentSkillRepository studentSkillRepository) {

        this.skillRepository = skillRepository;
        this.studentRepository = studentRepository;
        this.studentSkillRepository = studentSkillRepository;
    }

    // Create a new skill
    public Skill createSkill(String name) {

        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Skill name is required");
        }

        String normalizedName = name.trim();

        if (skillRepository.existsByNameIgnoreCase(normalizedName)) {
            throw new RuntimeException("Skill already exists");
        }

        Skill skill = new Skill(normalizedName);

        return skillRepository.save(skill);
    }

    // Get all available skills
    @Transactional(readOnly = true)
    public List<Skill> getAllSkills() {
        return skillRepository.findAll();
    }

    // Get skill by ID
    @Transactional(readOnly = true)
    public Skill getSkillById(Long skillId) {
        return skillRepository.findById(skillId)
                .orElseThrow(() -> new RuntimeException("Skill not found"));
    }

    // Find skill by name
    @Transactional(readOnly = true)
    public Skill getSkillByName(String name) {

        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Skill name is required");
        }

        return skillRepository.findByNameIgnoreCase(name.trim())
                .orElseThrow(() -> new RuntimeException("Skill not found"));
    }

    // Add skill to student profile
    public StudentSkill addSkillToStudent(
            Long studentId,
            Long skillId,
            ProficiencyLevel proficiencyLevel) {

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        Skill skill = skillRepository.findById(skillId)
                .orElseThrow(() -> new RuntimeException("Skill not found"));

        if (studentSkillRepository.existsByStudentIdAndSkillId(studentId, skillId)) {
            throw new RuntimeException("Student already has this skill");
        }

        if (proficiencyLevel == null) {
            throw new IllegalArgumentException("Proficiency level is required");
        }

        StudentSkill studentSkill = new StudentSkill(
                student,
                skill,
                proficiencyLevel
        );

        return studentSkillRepository.save(studentSkill);
    }

    // Get all skills of a student
    @Transactional(readOnly = true)
    public List<StudentSkill> getStudentSkills(Long studentId) {

        if (!studentRepository.existsById(studentId)) {
            throw new RuntimeException("Student not found");
        }

        return studentSkillRepository.findByStudentId(studentId);
    }

    // Update student skill proficiency
    public StudentSkill updateStudentSkillProficiency(
            Long studentId,
            Long skillId,
            ProficiencyLevel proficiencyLevel) {

        if (proficiencyLevel == null) {
            throw new IllegalArgumentException("Proficiency level is required");
        }

        StudentSkill studentSkill = studentSkillRepository
                .findById(new StudentSkillId(studentId, skillId))
                .orElseThrow(() -> new RuntimeException(
                        "Student skill not found"));

        studentSkill.setProficiencyLevel(proficiencyLevel);

        return studentSkillRepository.save(studentSkill);
    }

    // Remove skill from student profile
    public void removeSkillFromStudent(Long studentId, Long skillId) {

        StudentSkill studentSkill = studentSkillRepository
                .findById(new StudentSkillId(studentId, skillId))
                .orElseThrow(() -> new RuntimeException(
                        "Student skill not found"));

        studentSkillRepository.delete(studentSkill);
    }
}