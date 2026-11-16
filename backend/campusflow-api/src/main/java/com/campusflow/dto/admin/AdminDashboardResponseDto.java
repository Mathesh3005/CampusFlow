package com.campusflow.dto.admin;

public record AdminDashboardResponseDto(
        long totalUsers,
        long totalStudents,
        long totalOfficers,
        long activeOfficers,
        long totalJobs,
        long publishedJobs,
        long totalApplications) {
}
