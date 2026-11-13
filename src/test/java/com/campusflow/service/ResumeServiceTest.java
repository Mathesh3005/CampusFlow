package com.campusflow.service;

import com.campusflow.entity.Resume;
import com.campusflow.repository.ApplicationRepository;
import com.campusflow.repository.ResumeRepository;
import com.campusflow.repository.StudentRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;

import com.campusflow.event.ResumeDeletedEvent;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ResumeServiceTest {

    @Mock
    private ResumeRepository resumeRepository;

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private ResumeFileStorageService fileStorageService;

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private ResumeService resumeService;

    @Test
    void deleteResume_shouldThrowException_whenResumeIsUsedInApplication() {

        Long resumeId = 1L;
        Long studentId = 10L;

        Resume resume = mock(Resume.class);

        when(resumeRepository.findByIdAndStudentId(resumeId, studentId))
                .thenReturn(Optional.of(resume));

        when(applicationRepository.existsByResume_Id(resumeId))
                .thenReturn(true);

        assertThrows(
                IllegalStateException.class,
                () -> resumeService.deleteResume(resumeId, studentId)
        );

        verify(resumeRepository, never()).delete(any(Resume.class));
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void deleteResume_shouldDeleteDatabaseRecordAndPublishEvent_whenResumeIsUnused() {

        Long resumeId = 1L;
        Long studentId = 10L;
        String storagePath = "uploads/resumes/test-resume.pdf";

        Resume resume = mock(Resume.class);

        when(resumeRepository.findByIdAndStudentId(resumeId, studentId))
                .thenReturn(Optional.of(resume));

        when(applicationRepository.existsByResume_Id(resumeId))
                .thenReturn(false);

        when(resume.getStoragePath()).thenReturn(storagePath);

        resumeService.deleteResume(resumeId, studentId);

        verify(resumeRepository).delete(resume);

        ArgumentCaptor<Object> eventCaptor =
                ArgumentCaptor.forClass(Object.class);

        verify(eventPublisher).publishEvent(eventCaptor.capture());

        assertTrue(eventCaptor.getValue() instanceof ResumeDeletedEvent);

        ResumeDeletedEvent publishedEvent =
                (ResumeDeletedEvent) eventCaptor.getValue();

        assertEquals(storagePath, publishedEvent.storagePath());
    }

    @Test
    void deleteResume_shouldThrowException_whenResumeDoesNotBelongToStudent() {

        Long resumeId = 1L;
        Long studentId = 10L;

        when(resumeRepository.findByIdAndStudentId(resumeId, studentId))
                .thenReturn(Optional.empty());

        assertThrows(
                RuntimeException.class,
                () -> resumeService.deleteResume(resumeId, studentId)
        );

        verify(applicationRepository, never())
                .existsByResume_Id(anyLong());

        verify(eventPublisher, never()).publishEvent(any());
    }
}