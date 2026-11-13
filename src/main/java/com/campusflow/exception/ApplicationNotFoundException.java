package com.campusflow.exception;

public class ApplicationNotFoundException extends RuntimeException {
    public ApplicationNotFoundException(Long id) { super("Application not found: " + id); }
}
