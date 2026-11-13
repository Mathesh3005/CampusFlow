package com.campusflow.exception;

public class JobNotFoundException extends RuntimeException {
    public JobNotFoundException(Long id) { super("Job not found: " + id); }
}
