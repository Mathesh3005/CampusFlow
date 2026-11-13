package com.campusflow.repository;

import com.campusflow.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository
        extends JpaRepository<Notification, Long> {

    List<Notification> findByUserId(Long userId);

    List<Notification> findByUserIdAndIsReadFalse(Long userId);

    long countByUserIdAndIsReadFalse(Long userId);

    @EntityGraph(attributePaths = "user")
    Page<Notification> findByUserId(Long userId, Pageable pageable);

    @EntityGraph(attributePaths = "user")
    Optional<Notification> findByIdAndUserId(Long notificationId, Long userId);

    boolean existsByUser_IdAndTitleAndMessageAndNotificationType(
            Long userId, String title, String message, com.campusflow.entity.NotificationType notificationType);

    @Modifying
    @Query("update Notification n set n.isRead = true where n.user.id = :userId and n.isRead = false")
    int markAllReadForUser(@Param("userId") Long userId);
}
