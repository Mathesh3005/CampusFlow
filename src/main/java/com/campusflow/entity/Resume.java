package com.campusflow.entity;

import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "resumes")
public class Resume {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "storage_path", nullable = false, length = 500)
    private String storagePath;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType = "application/pdf";

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private OffsetDateTime uploadedAt;

    // Automatically sets upload timestamp
    @PrePersist
    protected void onCreate() {
        uploadedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    // Required by JPA
    protected Resume() {
    }

    // Parameterized constructor
    public Resume(
            Student student,
            String fileName,
            String storagePath,
            Long fileSize
    ) {
        this.student = student;
        this.fileName = fileName;
        this.storagePath = storagePath;
        this.fileSize = fileSize;
        this.contentType = "application/pdf";
        this.isActive = true;
    }

    // Getters

    public Long getId() {
        return id;
    }

    public Student getStudent() {
        return student;
    }

    public String getFileName() {
        return fileName;
    }

    public String getStoragePath() {
        return storagePath;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public String getContentType() {
        return contentType;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public OffsetDateTime getUploadedAt() {
        return uploadedAt;
    }

    // Setters

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }
}