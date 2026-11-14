package com.campusflow.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegisterStudentRequest(
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        @NotBlank @Size(max = 30) String registerNumber,
        @NotBlank @Size(max = 150) String fullName,
        @NotBlank @Size(max = 100) String department,
        @NotNull @Min(2020) @Max(2040) Integer graduationYear) { }
