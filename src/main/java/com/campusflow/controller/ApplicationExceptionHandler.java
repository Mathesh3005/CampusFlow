package com.campusflow.controller;

import com.campusflow.exception.ApplicationConflictException;
import com.campusflow.exception.ApplicationNotFoundException;
import com.campusflow.exception.InvalidApplicationTransitionException;
import com.campusflow.exception.JobNotFoundException;
import com.campusflow.exception.ResumeNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = ApplicationController.class)
public class ApplicationExceptionHandler {
    @ExceptionHandler({ApplicationNotFoundException.class, JobNotFoundException.class, ResumeNotFoundException.class})
    public ProblemDetail notFound(RuntimeException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler({ApplicationConflictException.class, InvalidApplicationTransitionException.class})
    public ProblemDetail conflict(RuntimeException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail invalid(MethodArgumentNotValidException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                "Application request contains invalid or missing fields");
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail forbidden(AccessDeniedException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, ex.getMessage());
    }
}
