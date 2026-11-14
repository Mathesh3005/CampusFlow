package com.campusflow.controller;

import com.campusflow.exception.ResumeInUseException;
import com.campusflow.exception.ResumeNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice
public class ResumeExceptionHandler {
    @ExceptionHandler(ResumeNotFoundException.class)
    public ProblemDetail notFound(ResumeNotFoundException exception) {
        return problem(HttpStatus.NOT_FOUND, exception.getMessage());
    }

    @ExceptionHandler(ResumeInUseException.class)
    public ProblemDetail conflict(ResumeInUseException exception) {
        return problem(HttpStatus.CONFLICT, exception.getMessage());
    }

    @ExceptionHandler({IllegalArgumentException.class, MissingServletRequestPartException.class})
    public ProblemDetail badRequest(Exception exception) {
        return problem(HttpStatus.BAD_REQUEST, exception.getMessage());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ProblemDetail payloadTooLarge(MaxUploadSizeExceededException exception) {
        return problem(HttpStatus.CONTENT_TOO_LARGE, "Resume file exceeds the configured upload limit");
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail forbidden(AccessDeniedException exception) {
        return problem(HttpStatus.FORBIDDEN, exception.getMessage());
    }

    private static ProblemDetail problem(HttpStatus status, String detail) {
        return ProblemDetail.forStatusAndDetail(status, detail == null ? status.getReasonPhrase() : detail);
    }
}
