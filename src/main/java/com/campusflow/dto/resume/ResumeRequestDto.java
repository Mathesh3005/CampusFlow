package com.campusflow.dto.resume;

import org.springframework.web.multipart.MultipartFile;

public class ResumeRequestDto {

    private MultipartFile file;

    public MultipartFile getFile() {
        return file;
    }

    public void setFile(MultipartFile file) {
        this.file = file;
    }
}