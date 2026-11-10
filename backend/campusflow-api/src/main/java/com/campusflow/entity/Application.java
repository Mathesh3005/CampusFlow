package com.campusflow.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.FetchType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import jakarta.persistence.Column;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import java.time.ZoneOffset;
import jakarta.persistence.JoinColumns;

import java.time.OffsetDateTime;

@Entity
@Table(name = "applications")
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ApplicationStatus status = ApplicationStatus.APPLIED;

    @Column(name = "cover_letter", columnDefinition = "TEXT")
    private String coverLetter;

    @Column(name = "applied_at", nullable = false, updatable = false)
    private OffsetDateTime appliedAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        appliedAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    protected Application() {
        // Required by JPA
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resume_id", referencedColumnName = "id")
    private Resume resume;

    public Application(Student student, Job job, String coverLetter) {
        this.student = student;
        this.job = job;
        this.coverLetter = coverLetter;
        this.status = ApplicationStatus.APPLIED;
    }

    public Long getId() {
        return id;
    }

    public Student getStudent() {
        return student;
    }

    public Job getJob() {
        return job;
    }

    public ApplicationStatus getStatus() {
        return status;
    }

    public String getCoverLetter() {
        return coverLetter;
    }

    public Resume getResume() {
        return resume;
    }

    public void setResume(Resume resume) {
        if (resume != null && !resume.getStudent().getId().equals(this.student.getId())) {
            throw new IllegalArgumentException(
                    "Selected resume must belong to the applicant."
            );
        }

        this.resume = resume;
    }

    public void setCoverLetter(String coverLetter) {
        this.coverLetter = coverLetter;
    }

    public OffsetDateTime getAppliedAt() {
        return appliedAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

}