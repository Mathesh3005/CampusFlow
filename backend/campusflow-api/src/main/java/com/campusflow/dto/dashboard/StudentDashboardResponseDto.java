package com.campusflow.dto.dashboard;

import java.math.BigDecimal;
import java.util.Map;

public class StudentDashboardResponseDto {

    private String studentName;
    private String department;
    private Integer graduationYear;
    private BigDecimal cgpa;

    private Long totalApplications;
    private Map<String, Long> applicationStats;

    private Long upcomingInterviews;
    private boolean hasActiveResume;
    private Long unreadNotifications;

    public String getStudentName() {
        return studentName;
    }

    public void setStudentName(String studentName) {
        this.studentName = studentName;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public Integer getGraduationYear() {
        return graduationYear;
    }

    public void setGraduationYear(Integer graduationYear) {
        this.graduationYear = graduationYear;
    }

    public BigDecimal getCgpa() {
        return cgpa;
    }

    public void setCgpa(BigDecimal cgpa) {
        this.cgpa = cgpa;
    }

    public Long getTotalApplications() {
        return totalApplications;
    }

    public void setTotalApplications(Long totalApplications) {
        this.totalApplications = totalApplications;
    }

    public Map<String, Long> getApplicationStats() {
        return applicationStats;
    }

    public void setApplicationStats(Map<String, Long> applicationStats) {
        this.applicationStats = applicationStats;
    }

    public Long getUpcomingInterviews() {
        return upcomingInterviews;
    }

    public void setUpcomingInterviews(Long upcomingInterviews) {
        this.upcomingInterviews = upcomingInterviews;
    }

    public boolean isHasActiveResume() {
        return hasActiveResume;
    }

    public void setHasActiveResume(boolean hasActiveResume) {
        this.hasActiveResume = hasActiveResume;
    }

    public Long getUnreadNotifications() {
        return unreadNotifications;
    }

    public void setUnreadNotifications(Long unreadNotifications) {
        this.unreadNotifications = unreadNotifications;
    }
}