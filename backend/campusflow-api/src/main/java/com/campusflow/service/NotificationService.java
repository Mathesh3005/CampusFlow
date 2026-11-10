package com.campusflow.service;

import com.campusflow.entity.Notification;
import com.campusflow.entity.NotificationType;
import com.campusflow.entity.User;
import com.campusflow.repository.NotificationRepository;
import com.campusflow.repository.UserRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(
            NotificationRepository notificationRepository,
            UserRepository userRepository
    ) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    // Create notification
    public Notification createNotification(
            Long userId,
            String title,
            String message,
            NotificationType notificationType
    ) {
        if (userId == null) {
            throw new RuntimeException("User ID is required");
        }

        if (title == null || title.isBlank()) {
            throw new RuntimeException("Notification title is required");
        }

        if (message == null || message.isBlank()) {
            throw new RuntimeException("Notification message is required");
        }

        if (notificationType == null) {
            throw new RuntimeException("Notification type is required");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

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
            throw new RuntimeException("User not found");
        }

        return notificationRepository.findByUserId(userId);
    }

    // Get unread notifications
    @Transactional(readOnly = true)
    public List<Notification> getUnreadNotifications(Long userId) {

        if (!userRepository.existsById(userId)) {
            throw new RuntimeException("User not found");
        }

        return notificationRepository
                .findByUserIdAndIsReadFalse(userId);
    }

    // Count unread notifications
    @Transactional(readOnly = true)
    public long countUnreadNotifications(Long userId) {

        if (!userRepository.existsById(userId)) {
            throw new RuntimeException("User not found");
        }

        return notificationRepository
                .countByUserIdAndIsReadFalse(userId);
    }

    // Mark notification as read
    public Notification markNotificationAsRead(
            Long notificationId,
            Long userId
    ) {
        Notification notification = notificationRepository
                .findById(notificationId)
                .orElseThrow(() ->
                        new RuntimeException("Notification not found"));

        if (!notification.getUser().getId().equals(userId)) {
            throw new RuntimeException(
                    "You are not authorized to access this notification"
            );
        }

        notification.setIsRead(true);

        return notificationRepository.save(notification);
    }

    // Mark all notifications as read
    public void markAllNotificationsAsRead(Long userId) {

        List<Notification> notifications =
                notificationRepository.findByUserIdAndIsReadFalse(userId);

        for (Notification notification : notifications) {
            notification.setIsRead(true);
        }

        notificationRepository.saveAll(notifications);
    }

    // Delete notification
    public void deleteNotification(
            Long notificationId,
            Long userId
    ) {
        Notification notification = notificationRepository
                .findById(notificationId)
                .orElseThrow(() ->
                        new RuntimeException("Notification not found"));

        if (!notification.getUser().getId().equals(userId)) {
            throw new RuntimeException(
                    "You are not authorized to delete this notification"
            );
        }

        notificationRepository.delete(notification);
    }
}