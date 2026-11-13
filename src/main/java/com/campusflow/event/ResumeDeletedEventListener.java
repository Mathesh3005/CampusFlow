package com.campusflow.event;

import com.campusflow.service.ResumeFileStorageService;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class ResumeDeletedEventListener {

    private final ResumeFileStorageService fileStorageService;

    public ResumeDeletedEventListener(
            ResumeFileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleResumeDeleted(ResumeDeletedEvent event) {

        fileStorageService.delete(event.storagePath());
    }
}