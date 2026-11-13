package com.campusflow.exception;

public class InterviewNotFoundException extends RuntimeException {
    public InterviewNotFoundException(Long id) { super("Interview not found: " + id); }
}
