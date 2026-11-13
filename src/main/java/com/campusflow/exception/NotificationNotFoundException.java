package com.campusflow.exception;

public class NotificationNotFoundException extends RuntimeException {
    public NotificationNotFoundException(Long id) { super("Notification not found: " + id); }
}
