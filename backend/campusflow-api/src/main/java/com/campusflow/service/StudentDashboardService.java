package com.campusflow.service;

import com.campusflow.dto.dashboard.StudentDashboardResponseDto;
import com.campusflow.entity.ApplicationStatus;
import com.campusflow.entity.InterviewStatus;
import com.campusflow.entity.Student;
import com.campusflow.repository.ApplicationRepository;
import com.campusflow.repository.InterviewRepository;
import com.campusflow.repository.NotificationRepository;
import com.campusflow.repository.ResumeRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class StudentDashboardService {

    private final ApplicationRepository applicationRepository;
    private final InterviewRepository interviewRepository;
    private final ResumeRepository resumeRepository;
    private final NotificationRepository notificationRepository;

    public StudentDashboardService(
            ApplicationRepository applicationRepository,
            InterviewRepository interviewRepository,
            ResumeRepository resumeRepository,
            NotificationRepository notificationRepository) {

        this.applicationRepository = applicationRepository;
        this.interviewRepository = interviewRepository;
        this.resumeRepository = resumeRepository;
        this.notificationRepository = notificationRepository;
    }

    @Transactional(readOnly = true)
    public StudentDashboardResponseDto getDashboard(Student student) {

        Long studentId = student.getId();
        Long userId = student.getUser().getId();

        StudentDashboardResponseDto response =
                new StudentDashboardResponseDto();

        response.setStudentName(student.getFullName());
        response.setDepartment(student.getDepartment());
        response.setGraduationYear(student.getGraduationYear());
        response.setCgpa(student.getCgpa());

        Map<String, Long> stats = new LinkedHashMap<>();

        for (ApplicationStatus status : ApplicationStatus.values()) {
            stats.put(toCamelCase(status.name()), 0L);
        }

        long totalApplications = 0;

        for (Object[] row :
                applicationRepository.countApplicationsByStatus(studentId)) {

            ApplicationStatus status = (ApplicationStatus) row[0];
            Long count = ((Number) row[1]).longValue();

            stats.put(toCamelCase(status.name()), count);
            totalApplications += count;
        }

        response.setTotalApplications(totalApplications);
        response.setApplicationStats(stats);

        long upcomingInterviews =
                interviewRepository
                        .countByApplication_Student_IdAndStatusAndScheduledAtAfter(
                                studentId,
                                InterviewStatus.SCHEDULED,
                                OffsetDateTime.now()
                        );

        response.setUpcomingInterviews(upcomingInterviews);

        response.setHasActiveResume(
                resumeRepository.existsByStudentIdAndIsActiveTrue(studentId)
        );

        response.setUnreadNotifications(
                notificationRepository.countByUserIdAndIsReadFalse(userId)
        );

        return response;
    }

    private String toCamelCase(String value) {
        String[] parts = value.toLowerCase().split("_");

        StringBuilder result = new StringBuilder(parts[0]);

        for (int i = 1; i < parts.length; i++) {
            result.append(Character.toUpperCase(parts[i].charAt(0)))
                    .append(parts[i].substring(1));
        }

        return result.toString();
    }
}