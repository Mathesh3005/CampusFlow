package com.campusflow.event;

import com.campusflow.service.ResumeFileStorageService;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ResumeDeletedEventListenerTest {

    @Mock
    private ResumeFileStorageService fileStorageService;

    @InjectMocks
    private ResumeDeletedEventListener eventListener;

    @Test
    void handleResumeDeleted_shouldDeletePhysicalFile() {

        String storagePath = "uploads/resumes/test-resume.pdf";

        ResumeDeletedEvent event =
                new ResumeDeletedEvent(storagePath);

        eventListener.handleResumeDeleted(event);

        verify(fileStorageService).delete(storagePath);
    }

    @Test
    void handleResumeDeleted_shouldCallDeleteOnlyOnce() {

        String storagePath = "uploads/resumes/test-resume.pdf";

        ResumeDeletedEvent event =
                new ResumeDeletedEvent(storagePath);

        eventListener.handleResumeDeleted(event);

        verify(fileStorageService, times(1)).delete(storagePath);
    }
}