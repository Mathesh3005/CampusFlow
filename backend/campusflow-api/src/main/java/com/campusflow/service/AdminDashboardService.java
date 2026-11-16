package com.campusflow.service;

import com.campusflow.dto.admin.AdminDashboardResponseDto;
import com.campusflow.entity.JobStatus;
import com.campusflow.repository.ApplicationRepository;
import com.campusflow.repository.JobRepository;
import com.campusflow.repository.PlacementOfficerRepository;
import com.campusflow.repository.StudentRepository;
import com.campusflow.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminDashboardService {

    private final UserRepository users;
    private final StudentRepository students;
    private final PlacementOfficerRepository officers;
    private final JobRepository jobs;
    private final ApplicationRepository applications;

    public AdminDashboardService(
            UserRepository users,
            StudentRepository students,
            PlacementOfficerRepository officers,
            JobRepository jobs,
            ApplicationRepository applications) {
        this.users = users;
        this.students = students;
        this.officers = officers;
        this.jobs = jobs;
        this.applications = applications;
    }

    @Transactional(readOnly = true)
    public AdminDashboardResponseDto getDashboard() {
        return new AdminDashboardResponseDto(
                users.count(),
                students.count(),
                officers.count(),
                officers.countByUser_IsActiveTrue(),
                jobs.count(),
                jobs.countByStatus(JobStatus.PUBLISHED),
                applications.count());
    }
}
