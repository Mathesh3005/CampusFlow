package com.campusflow.service;

import com.campusflow.entity.Notification;
import com.campusflow.entity.NotificationType;
import com.campusflow.entity.User;
import com.campusflow.entity.Role;
import com.campusflow.entity.Student;
import com.campusflow.entity.Application;
import com.campusflow.entity.Interview;
import com.campusflow.entity.Job;
import com.campusflow.repository.NotificationRepository;
import com.campusflow.repository.StudentRepository;
import com.campusflow.repository.UserRepository;
import com.campusflow.exception.NotificationNotFoundException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Service
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final StudentRepository studentRepository;

    public NotificationService(
            NotificationRepository notificationRepository,
            UserRepository userRepository,
            StudentRepository studentRepository
    ) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
    }

    // Create notification
    public Notification createNotification(
            Long userId,
            String title,
            String message,
            NotificationType notificationType
    ) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID is required");
        }

        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Notification title is required");
        }
        if (title.length() > 150) throw new IllegalArgumentException("Notification title must not exceed 150 characters");

        if (message == null || message.isBlank()) {
            throw new IllegalArgumentException("Notification message is required");
        }

        if (notificationType == null) {
            throw new IllegalArgumentException("Notification type is required");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new IllegalArgumentException("User not found"));

        Notification notification = new Notification(
                user,
                title.trim(),
                message.trim(),
                notificationType
        );

        return notificationRepository.save(notification);
    }

    // Get all notifications for a user
    @Transactional(readOnly = true)
    public List<Notification> getNotificationsByUser(Long userId) {

        if (!userRepository.existsById(userId)) {
            throw new IllegalArgumentException("User not found");
        }

        return notificationRepository.findByUserId(userId);
    }

    @Transactional(readOnly = true)
    public Page<Notification> getNotificationsByUser(Long userId, Pageable pageable) {
        if (!userRepository.existsById(userId)) throw new IllegalArgumentException("User not found");
        return notificationRepository.findByUserId(userId, pageable);
    }

    @Transactional(readOnly = true)
    public Notification getNotification(Long notificationId, Long userId) {
        return notificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new NotificationNotFoundException(notificationId));
    }

    // Get unread notifications
    @Transactional(readOnly = true)
    public List<Notification> getUnreadNotifications(Long userId) {

        if (!userRepository.existsById(userId)) {
            throw new IllegalArgumentException("User not found");
        }

        return notificationRepository
                .findByUserIdAndIsReadFalse(userId);
    }

    // Count unread notifications
    @Transactional(readOnly = true)
    public long countUnreadNotifications(Long userId) {

        if (!userRepository.existsById(userId)) {
            throw new IllegalArgumentException("User not found");
        }

        return notificationRepository
                .countByUserIdAndIsReadFalse(userId);
    }

    // Mark notification as read
    public Notification markNotificationAsRead(
            Long notificationId,
            Long userId
    ) {
        Notification notification = getNotification(notificationId, userId);

        notification.setIsRead(true);

        return notificationRepository.save(notification);
    }

    // Mark all notifications as read
    public void markAllNotificationsAsRead(Long userId) {

        if (!userRepository.existsById(userId)) throw new IllegalArgumentException("User not found");
        notificationRepository.markAllReadForUser(userId);
    }

    // Delete notification
    public void deleteNotification(
            Long notificationId,
            Long userId
    ) {
        Notification notification = getNotification(notificationId, userId);
        notificationRepository.delete(notification);
    }

    /** Creates an event notification once per recipient and identical event content. */
    public void createNotificationIfAbsent(Long userId, String title, String message,
                                           NotificationType type) {
        if (notificationRepository.existsByUser_IdAndTitleAndMessageAndNotificationType(userId, title, message, type)) {
            return;
        }
        createNotification(userId, title, message, type);
    }

    public void applicationSubmitted(Application application) {
        Long officerUserId = application.getJob().getCreatedBy().getUser().getId();
        createNotificationIfAbsent(officerUserId, "New job application",
                "Application #" + application.getId() + " was submitted for " + application.getJob().getJobTitle() + ".",
                NotificationType.APPLICATION_UPDATE);
    }

    public void applicationStatusChanged(Application application) {
        Long studentUserId = application.getStudent().getUser().getId();
        createNotificationIfAbsent(studentUserId, "Application status updated",
                "Your application #" + application.getId() + " for " + application.getJob().getJobTitle()
                        + " is now " + application.getStatus() + ".",
                NotificationType.APPLICATION_UPDATE);
    }

    public void interviewScheduled(Interview interview) {
        Long studentUserId = interview.getApplication().getStudent().getUser().getId();
        createNotificationIfAbsent(studentUserId, "Interview scheduled",
                "Interview #" + interview.getId() + " for " + interview.getApplication().getJob().getJobTitle()
                        + " is scheduled for " + interview.getScheduledAt() + ".",
                NotificationType.INTERVIEW);
    }

    public void interviewUpdated(Interview interview) {
        Long studentUserId = interview.getApplication().getStudent().getUser().getId();
        createNotificationIfAbsent(studentUserId, "Interview updated",
                "Interview #" + interview.getId() + " for " + interview.getApplication().getJob().getJobTitle()
                        + " was updated. New time: " + interview.getScheduledAt() + ".",
                NotificationType.INTERVIEW);
    }

    public void interviewCancelled(Interview interview) {
        Long studentUserId = interview.getApplication().getStudent().getUser().getId();
        createNotificationIfAbsent(studentUserId, "Interview cancelled",
                "Interview #" + interview.getId() + " for " + interview.getApplication().getJob().getJobTitle()
                        + " was cancelled.", NotificationType.INTERVIEW);
    }

    public void jobPublished(Job job) {
        List<Student> eligibleStudents = job.getMinimumCgpa() == null
                ? studentRepository.findAll()
                : studentRepository.findByCgpaGreaterThanEqual(job.getMinimumCgpa());
        String message = "A new job was published: " + job.getCompanyName() + " - " + job.getJobTitle()
                + " (job #" + job.getId() + ").";
        for (Student student : eligibleStudents) {
            User user = student.getUser();
            if (user.getRole() == Role.STUDENT && Boolean.TRUE.equals(user.getIsActive())) {
                createNotificationIfAbsent(user.getId(), "New job opportunity", message, NotificationType.JOB_UPDATE);
            }
        }
    }
}
