package com.campusflow.dto.analytics;

import java.math.BigDecimal;

public class AnalyticsOverviewResponseDto {

    private Long totalStudents;
    private Long totalJobs;
    private Long publishedJobs;
    private Long totalApplications;
    private Long totalApplicants;
    private Long selectedStudents;
    private Long selectedApplications;
    private BigDecimal placementRate;
    private BigDecimal applicationSelectionRate;

    public Long getTotalStudents() {
        return totalStudents;
    }

    public void setTotalStudents(Long totalStudents) {
        this.totalStudents = totalStudents;
    }

    public Long getTotalJobs() {
        return totalJobs;
    }

    public void setTotalJobs(Long totalJobs) {
        this.totalJobs = totalJobs;
    }

    public Long getPublishedJobs() {
        return publishedJobs;
    }

    public void setPublishedJobs(Long publishedJobs) {
        this.publishedJobs = publishedJobs;
    }

    public Long getTotalApplications() {
        return totalApplications;
    }

    public void setTotalApplications(Long totalApplications) {
        this.totalApplications = totalApplications;
    }

    public Long getTotalApplicants() {
        return totalApplicants;
    }

    public void setTotalApplicants(Long totalApplicants) {
        this.totalApplicants = totalApplicants;
    }

    public Long getSelectedApplications() {
        return selectedApplications;
    }

    public void setSelectedApplications(Long selectedApplications) {
        this.selectedApplications = selectedApplications;
    }

    public BigDecimal getApplicationSelectionRate() {
        return applicationSelectionRate;
    }

    public void setApplicationSelectionRate(BigDecimal applicationSelectionRate) {
        this.applicationSelectionRate = applicationSelectionRate;
    }

    public Long getSelectedStudents() {
        return selectedStudents;
    }

    public void setSelectedStudents(Long selectedStudents) {
        this.selectedStudents = selectedStudents;
    }

    public BigDecimal getPlacementRate() {
        return placementRate;
    }

    public void setPlacementRate(BigDecimal placementRate) {
        this.placementRate = placementRate;
    }
}