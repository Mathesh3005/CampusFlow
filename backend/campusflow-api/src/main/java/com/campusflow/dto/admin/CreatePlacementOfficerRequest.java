package com.campusflow.dto.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreatePlacementOfficerRequest(
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        @NotBlank @Size(max = 30) String employeeId,
        @NotBlank @Size(max = 150) String fullName,
        @Size(max = 100) String department,
        @Size(max = 15) String phone) {
}
