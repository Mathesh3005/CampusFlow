package com.campusflow.dto.job;

import com.campusflow.entity.EmploymentType;
import com.campusflow.entity.WorkMode;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public class JobRequestDto {

    private String companyName;
    private String jobTitle;
    private String jobDescription;
    private String location;

    private EmploymentType employmentType;
    private WorkMode workMode;

    private BigDecimal minimumCgpa;
    private BigDecimal salaryMin;
    private BigDecimal salaryMax;

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