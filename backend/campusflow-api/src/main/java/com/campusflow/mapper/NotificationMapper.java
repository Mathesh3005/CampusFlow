package com.campusflow.mapper;

import com.campusflow.dto.notification.NotificationResponseDto;
import com.campusflow.entity.Notification;

public class NotificationMapper {

    private NotificationMapper() {
    }

    public static NotificationResponseDto toResponseDto(Notification notification) {

        if (notification == null) {
            return null;
        }

        NotificationResponseDto dto = new NotificationResponseDto();

        dto.setId(notification.getId());
        dto.setUserId(notification.getUser().getId());
        dto.setTitle(notification.getTitle());
        dto.setMessage(notification.getMessage());
        dto.setNotificationType(notification.getNotificationType());
        dto.setIsRead(notification.getIsRead());
        dto.setCreatedAt(notification.getCreatedAt());

        return dto;
    }
}