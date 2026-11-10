package com.campusflow.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Column;
import jakarta.persistence.OneToOne;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.FetchType;
import java.time.OffsetDateTime;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import java.time.ZoneOffset;

@Entity
@Table(name = "placement_officers")
public class PlacementOfficer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "user_id",
            nullable = false,
            unique = true
    )
    private User user;

    @Column(name = "employee_id", nullable = false, unique = true, length = 30)
    private String employeeId;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(name = "department", length = 100)
    private String department;

    @Column(name = "phone", length = 15)
    private String phone;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    protected PlacementOfficer() {
        // Required by JPA
    }

    public PlacementOfficer(
            User user,
            String employeeId,
            String fullName
    ) {
        this.user = user;
        this.employeeId = employeeId;
        this.fullName = fullName;
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public String getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(String employeeId) {
        this.employeeId = employeeId;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

}