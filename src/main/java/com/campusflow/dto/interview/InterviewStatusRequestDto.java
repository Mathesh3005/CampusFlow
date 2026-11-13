package com.campusflow.dto.interview;

import com.campusflow.entity.InterviewStatus;
import jakarta.validation.constraints.NotNull;

public class InterviewStatusRequestDto {
    @NotNull
    private InterviewStatus status;

    public InterviewStatus getStatus() { return status; }
    public void setStatus(InterviewStatus status) { this.status = status; }
}
