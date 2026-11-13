package com.campusflow.service;

import com.campusflow.entity.Application;
import com.campusflow.entity.ApplicationStatus;
import com.campusflow.entity.Interview;
import com.campusflow.entity.InterviewMode;
import com.campusflow.entity.InterviewStatus;
import com.campusflow.exception.ApplicationNotFoundException;
import com.campusflow.exception.InvalidInterviewOperationException;
import com.campusflow.repository.ApplicationRepository;
import com.campusflow.repository.InterviewRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InterviewServiceTest {
    @Mock InterviewRepository interviewRepository;
    @Mock ApplicationRepository applicationRepository;
    @Mock NotificationService notificationService;
    @InjectMocks InterviewService service;

    @Test
    void schedulesFutureInterviewForShortlistedApplication() {
        Application application = mock(Application.class);
        when(application.getStatus()).thenReturn(ApplicationStatus.SHORTLISTED);
        when(applicationRepository.findByIdAndJob_CreatedBy_User_Id(51L, 71L)).thenReturn(Optional.of(application));
        when(interviewRepository.save(any(Interview.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OffsetDateTime schedule = OffsetDateTime.now().plusDays(1);
        Interview interview = service.scheduleForOfficer(51L, 71L, schedule, InterviewMode.ONLINE,
                "https://meet.example.test/room", "First round");

        assertEquals(schedule, interview.getScheduledAt());
        assertEquals(InterviewMode.ONLINE, interview.getInterviewMode());
        assertEquals("https://meet.example.test/room", interview.getLocationOrLink());
        assertEquals(InterviewStatus.SCHEDULED, interview.getStatus());
    }

    @Test
    void rejectsMissingApplicationAndNonShortlistedApplication() {
        when(applicationRepository.findByIdAndJob_CreatedBy_User_Id(51L, 71L)).thenReturn(Optional.empty());
        assertThrows(ApplicationNotFoundException.class, () -> service.scheduleForOfficer(51L, 71L,
                OffsetDateTime.now().plusDays(1), InterviewMode.OFFLINE, "Room 2", null));

        Application applied = mock(Application.class);
        when(applied.getStatus()).thenReturn(ApplicationStatus.APPLIED);
        when(applicationRepository.findByIdAndJob_CreatedBy_User_Id(52L, 71L)).thenReturn(Optional.of(applied));
        assertThrows(InvalidInterviewOperationException.class, () -> service.scheduleForOfficer(52L, 71L,
                OffsetDateTime.now().plusDays(1), InterviewMode.OFFLINE, "Room 2", null));
    }

    @Test
    void rejectsPastScheduleAndInvalidStatusTransition() {
        Application shortlisted = mock(Application.class);
        when(shortlisted.getStatus()).thenReturn(ApplicationStatus.SHORTLISTED);
        when(applicationRepository.findByIdAndJob_CreatedBy_User_Id(51L, 71L)).thenReturn(Optional.of(shortlisted));
        assertThrows(IllegalArgumentException.class, () -> service.scheduleForOfficer(51L, 71L,
                OffsetDateTime.now().minusMinutes(1), InterviewMode.OFFLINE, "Room 2", null));

        Interview interview = new Interview(mock(Application.class), OffsetDateTime.now().plusDays(1), InterviewMode.OFFLINE);
        when(interviewRepository.findByIdAndApplication_Job_CreatedBy_User_Id(91L, 71L))
                .thenReturn(Optional.of(interview));
        when(interviewRepository.save(any(Interview.class))).thenAnswer(invocation -> invocation.getArgument(0));
        service.updateStatusForOfficer(91L, 71L, InterviewStatus.COMPLETED);
        assertEquals(InterviewStatus.COMPLETED, interview.getStatus());
        assertThrows(InvalidInterviewOperationException.class,
                () -> service.updateStatusForOfficer(91L, 71L, InterviewStatus.CANCELLED));
    }

    @Test
    void authorizedOfficerCanDeleteInterviewRecord() {
        Interview completed = new Interview(mock(Application.class), OffsetDateTime.now().plusDays(1), InterviewMode.ONLINE);
        completed.setStatus(InterviewStatus.COMPLETED);
        when(interviewRepository.findByIdAndApplication_Job_CreatedBy_User_Id(91L, 71L))
                .thenReturn(Optional.of(completed));

        service.deleteForOfficer(91L, 71L);
        verify(interviewRepository).delete(completed);
    }
}
