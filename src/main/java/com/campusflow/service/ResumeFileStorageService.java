package com.campusflow.service;

import com.campusflow.config.ResumeStorageProperties;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.UUID;

@Service
public class ResumeFileStorageService {

    private final Path storageDirectory;
    private final ResumeStorageProperties properties;

    // Constructor
    public ResumeFileStorageService(ResumeStorageProperties properties) {

        this.properties = properties;

        this.storageDirectory = Path.of(properties.getStorageLocation())
                .toAbsolutePath()
                .normalize();

        try {
            Files.createDirectories(storageDirectory);
        } catch (IOException exception) {
            throw new IllegalStateException(
                    "Could not initialize resume storage directory",
                    exception
            );
        }
    }

    // Store resume
    public String store(MultipartFile file) {

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Resume file is required");
        }

        if (file.getSize() > properties.getMaxSize()) {
            throw new IllegalArgumentException(
                    "Resume file must not exceed 5 MB"
            );
        }

        try {
            byte[] fileBytes = file.getBytes();

            if (!isPdf(fileBytes)) {
                throw new IllegalArgumentException(
                        "Only valid PDF files are allowed"
                );
            }

            String storedFileName = UUID.randomUUID() + ".pdf";

            Path destination = storageDirectory
                    .resolve(storedFileName)
                    .normalize();

            if (!destination.startsWith(storageDirectory)) {
                throw new IllegalStateException("Invalid storage path");
            }

            Files.write(
                    destination,
                    fileBytes,
                    StandardOpenOption.CREATE_NEW
            );

            return destination.toString();

        } catch (IOException exception) {
            throw new IllegalStateException(
                    "Could not store resume file",
                    exception
            );
        }
    }

    // Validate PDF signature
    private boolean isPdf(byte[] fileBytes) {

        if (fileBytes.length < 5) {
            return false;
        }

        return fileBytes[0] == '%'
                && fileBytes[1] == 'P'
                && fileBytes[2] == 'D'
                && fileBytes[3] == 'F'
                && fileBytes[4] == '-';
    }

    // Delete resume
    public void delete(String storagePath) {

        if (storagePath == null || storagePath.isBlank()) {
            return;
        }

        try {
            Path filePath = Path.of(storagePath)
                    .toAbsolutePath()
                    .normalize();

            // Allow deletion only of direct children of storage directory.
            if (!storageDirectory.equals(filePath.getParent())) {
                throw new IllegalArgumentException(
                        "Invalid resume storage path"
                );
            }

            // Only allow UUID-based PDF filenames.
            String fileName = filePath.getFileName().toString();

            if (!fileName.matches(
                    "^[0-9a-fA-F-]{36}\\.pdf$")) {

                throw new IllegalArgumentException(
                        "Invalid resume filename"
                );
            }

            Files.deleteIfExists(filePath);

        } catch (IOException exception) {

            throw new IllegalStateException(
                    "Could not delete resume file",
                    exception
            );
        }
    }
}