package com.campusflow.dto.job;

import com.campusflow.entity.EmploymentType;
import com.campusflow.entity.WorkMode;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class JobRequestDto {

    @NotBlank @Size(max = 150)
    private String companyName;
    @NotBlank @Size(max = 150)
    private String jobTitle;
    @NotBlank
    private String jobDescription;
    @Size(max = 150)
    private String location;

    @NotNull
    private EmploymentType employmentType;
    @NotNull
    private WorkMode workMode;

    @DecimalMin("0.00") @DecimalMax("10.00")
    private BigDecimal minimumCgpa;
    @DecimalMin("0.00")
    private BigDecimal salaryMin;
    @DecimalMin("0.00")
    private BigDecimal salaryMax;

    @NotNull @Future
    private OffsetDateTime applicationDeadline;

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getJobTitle() {
        return jobTitle;
    }

    public void setJobTitle(String jobTitle) {
        this.jobTitle = jobTitle;
    }

    public String getJobDescription() {
        return jobDescription;
    }

    public void setJobDescription(String jobDescription) {
        this.jobDescription = jobDescription;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public EmploymentType getEmploymentType() {
        return employmentType;
    }

    public void setEmploymentType(EmploymentType employmentType) {
        this.employmentType = employmentType;
    }

    public WorkMode getWorkMode() {
        return workMode;
    }

    public void setWorkMode(WorkMode workMode) {
        this.workMode = workMode;
    }

    public BigDecimal getMinimumCgpa() {
        return minimumCgpa;
    }

    public void setMinimumCgpa(BigDecimal minimumCgpa) {
        this.minimumCgpa = minimumCgpa;
    }

    public BigDecimal getSalaryMin() {
        return salaryMin;
    }

    public void setSalaryMin(BigDecimal salaryMin) {
        this.salaryMin = salaryMin;
    }

    public BigDecimal getSalaryMax() {
        return salaryMax;
    }

    public void setSalaryMax(BigDecimal salaryMax) {
        this.salaryMax = salaryMax;
    }

    public OffsetDateTime getApplicationDeadline() {
        return applicationDeadline;
    }

    public void setApplicationDeadline(OffsetDateTime applicationDeadline) {
        this.applicationDeadline = applicationDeadline;
    }
}
