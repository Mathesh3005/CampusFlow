package com.campusflow.dto.dashboard;

public class OfficerDashboardResponseDto {

    private Long totalJobs;
    private Long publishedJobs;
    private Long draftJobs;
    private Long closedJobs;
    private Long totalApplications;
    private Long pendingApplications;
    private Long underReviewApplications;
    private Long shortlistedApplications;
    private Long selectedApplications;
    private Long rejectedApplications;
    private Long withdrawnApplications;
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

    public Long getDraftJobs() {
        return draftJobs;
    }

    public void setDraftJobs(Long draftJobs) {
        this.draftJobs = draftJobs;
    }

    public Long getClosedJobs() {
        return closedJobs;
    }

    public void setClosedJobs(Long closedJobs) {
        this.closedJobs = closedJobs;
    }

    public Long getUnderReviewApplications() {
        return underReviewApplications;
    }

    public void setUnderReviewApplications(Long underReviewApplications) {
        this.underReviewApplications = underReviewApplications;
    }

    public Long getShortlistedApplications() {
        return shortlistedApplications;
    }

    public void setShortlistedApplications(Long shortlistedApplications) {
        this.shortlistedApplications = shortlistedApplications;
    }

    public Long getSelectedApplications() {
        return selectedApplications;
    }

    public void setSelectedApplications(Long selectedApplications) {
        this.selectedApplications = selectedApplications;
    }

    public Long getRejectedApplications() {
        return rejectedApplications;
    }

    public void setRejectedApplications(Long rejectedApplications) {
        this.rejectedApplications = rejectedApplications;
    }

    public Long getWithdrawnApplications() {
        return withdrawnApplications;
    }

    public void setWithdrawnApplications(Long withdrawnApplications) {
        this.withdrawnApplications = withdrawnApplications;
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