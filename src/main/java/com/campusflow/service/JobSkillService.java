package com.campusflow.service;

import com.campusflow.entity.*;
import com.campusflow.repository.*;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class JobSkillService {

    private final JobSkillRepository jobSkillRepository;
    private final JobRepository jobRepository;
    private final SkillRepository skillRepository;

    public JobSkillService(
            JobSkillRepository jobSkillRepository,
            JobRepository jobRepository,
            SkillRepository skillRepository) {

        this.jobSkillRepository = jobSkillRepository;
        this.jobRepository = jobRepository;
        this.skillRepository = skillRepository;
    }

    // Add a required skill to a job
    public JobSkill addSkillToJob(Long jobId, Long skillId) {

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found"));

        Skill skill = skillRepository.findById(skillId)
                .orElseThrow(() -> new RuntimeException("Skill not found"));

        if (jobSkillRepository.existsByJobIdAndSkillId(jobId, skillId)) {
            throw new RuntimeException("This skill is already assigned to the job");
        }

        if (job.getStatus() != JobStatus.DRAFT) {
            throw new RuntimeException(
                    "Required skills can only be modified for draft jobs");
        }

        JobSkill jobSkill = new JobSkill(job, skill);

        return jobSkillRepository.save(jobSkill);
    }

    // Get all skills required for a job
    @Transactional(readOnly = true)
    public List<JobSkill> getJobSkills(Long jobId) {

        if (!jobRepository.existsById(jobId)) {
            throw new RuntimeException("Job not found");
        }

        return jobSkillRepository.findByJobId(jobId);
    }

    // Get all jobs requiring a particular skill
    @Transactional(readOnly = true)
    public List<JobSkill> getJobsBySkill(Long skillId) {

        if (!skillRepository.existsById(skillId)) {
            throw new RuntimeException("Skill not found");
        }

        return jobSkillRepository.findBySkillId(skillId);
    }

    // Remove a required skill from a job
    public void removeSkillFromJob(Long jobId, Long skillId) {

        JobSkill jobSkill = jobSkillRepository
                .findById(new JobSkillId(jobId, skillId))
                .orElseThrow(() -> new RuntimeException(
                        "Job skill relationship not found"));

        if (jobSkill.getJob().getStatus() != JobStatus.DRAFT) {
            throw new RuntimeException(
                    "Required skills can only be modified for draft jobs");
        }

        jobSkillRepository.delete(jobSkill);
    }
}