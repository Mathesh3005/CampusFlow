package com.campusflow.controller;

import com.campusflow.dto.notification.NotificationResponseDto;
import com.campusflow.dto.common.PageResponseDto;
import com.campusflow.mapper.NotificationMapper;
import com.campusflow.service.NotificationService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/student/notifications")
@PreAuthorize("hasRole('STUDENT')")
public class StudentNotificationController {
    private final NotificationService notifications;

    public StudentNotificationController(NotificationService notifications) {
        this.notifications = notifications;
    }

    @GetMapping
    public PageResponseDto<NotificationResponseDto> list(Authentication authentication,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return PageResponseDto.from(notifications.getNotificationsByUser(userId(authentication), pageable)
                .map(NotificationMapper::toResponseDto));
    }

    @GetMapping("/{id}")
    public NotificationResponseDto get(Authentication authentication, @PathVariable Long id) {
        return NotificationMapper.toResponseDto(notifications.getNotification(id, userId(authentication)));
    }

    @PatchMapping("/{id}/read")
    public NotificationResponseDto markRead(Authentication authentication, @PathVariable Long id) {
        return NotificationMapper.toResponseDto(notifications.markNotificationAsRead(id, userId(authentication)));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllRead(Authentication authentication) {
        notifications.markAllNotificationsAsRead(userId(authentication));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(Authentication authentication, @PathVariable Long id) {
        notifications.deleteNotification(id, userId(authentication));
        return ResponseEntity.noContent().build();
    }

    static Long userId(Authentication authentication) {
        if (!(authentication instanceof JwtAuthenticationToken jwt)) {
            throw new AccessDeniedException("A JWT-authenticated user account is required");
        }
        try {
            return Long.valueOf(jwt.getToken().getSubject());
        } catch (RuntimeException ex) {
            throw new AccessDeniedException("Invalid authenticated user");
        }
    }
}
