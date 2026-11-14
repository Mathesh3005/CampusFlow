package com.campusflow.controller;

import com.campusflow.exception.ApplicationNotFoundException;
import com.campusflow.exception.InterviewNotFoundException;
import com.campusflow.exception.InvalidInterviewOperationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = InterviewController.class)
public class InterviewExceptionHandler {
    @ExceptionHandler({InterviewNotFoundException.class, ApplicationNotFoundException.class})
    public ProblemDetail notFound(RuntimeException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(InvalidInterviewOperationException.class)
    public ProblemDetail conflict(InvalidInterviewOperationException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler({IllegalArgumentException.class, MethodArgumentNotValidException.class})
    public ProblemDetail invalid(Exception ex) {
        String detail = ex instanceof IllegalArgumentException && ex.getMessage() != null
                ? ex.getMessage() : "Interview request contains invalid or missing fields";
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, detail);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail forbidden(AccessDeniedException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, ex.getMessage());
    }
}
