package com.campusflow.dto.dashboard;

public class OfficerDashboardResponseDto {

    private Long totalJobs;
    private Long publishedJobs;
    private Long totalApplications;
    private Long pendingApplications;
    private Long scheduledInterviews;

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

    public Long getPendingApplications() {
        return pendingApplications;
    }

    public void setPendingApplications(Long pendingApplications) {
        this.pendingApplications = pendingApplications;
    }

    public Long getScheduledInterviews() {
        return scheduledInterviews;
    }

    public void setScheduledInterviews(Long scheduledInterviews) {
        this.scheduledInterviews = scheduledInterviews;
    }
}