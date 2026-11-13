package com.campusflow.mapper;

import com.campusflow.dto.interview.InterviewResponseDto;
import com.campusflow.entity.Interview;

public class InterviewMapper {

    private InterviewMapper() {
    }

    public static InterviewResponseDto toResponseDto(Interview interview) {

        if (interview == null) {
            return null;
        }

        InterviewResponseDto dto = new InterviewResponseDto();

        dto.setId(interview.getId());
        dto.setApplicationId(interview.getApplication().getId());
        dto.setScheduledAt(interview.getScheduledAt());
        dto.setInterviewMode(interview.getInterviewMode());
        dto.setLocationOrLink(interview.getLocationOrLink());
        dto.setStatus(interview.getStatus());
        dto.setNotes(interview.getNotes());
        dto.setCreatedAt(interview.getCreatedAt());
        dto.setUpdatedAt(interview.getUpdatedAt());

        return dto;
    }
}