package com.campusflow.dto.student;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record StudentProfileUpdateRequest(
        @NotBlank @Size(max = 150) String fullName,
        @NotBlank @Size(max = 100) String department,
        @Min(2020) @Max(2040) Integer graduationYear,
        @DecimalMin("0.0") @DecimalMax("10.0") BigDecimal cgpa,
        @Size(max = 15) String phone) {
}
