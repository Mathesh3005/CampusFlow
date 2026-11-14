package com.campusflow.dto.interview;

import com.campusflow.entity.InterviewMode;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;

public class InterviewUpdateRequestDto {
    @NotNull @Future
    private OffsetDateTime scheduledAt;
    @NotNull
    private InterviewMode interviewMode;
    @NotBlank @Size(max = 500)
    private String locationOrLink;
    private String notes;

    public OffsetDateTime getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(OffsetDateTime scheduledAt) { this.scheduledAt = scheduledAt; }
    public InterviewMode getInterviewMode() { return interviewMode; }
    public void setInterviewMode(InterviewMode interviewMode) { this.interviewMode = interviewMode; }
    public String getLocationOrLink() { return locationOrLink; }
    public void setLocationOrLink(String locationOrLink) { this.locationOrLink = locationOrLink; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
