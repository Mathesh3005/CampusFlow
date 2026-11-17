package com.campusflow.dto.project;

import java.time.LocalDate;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;

public class ProjectRequestDto {

    @NotBlank @Size(max = 150)
    private String title;
    @Size(max = 10000)
    private String description;
    @Size(max = 500) @Pattern(regexp = "(?i)^$|^https?://\\S+$")
    private String githubUrl;
    @Size(max = 500) @Pattern(regexp = "(?i)^$|^https?://\\S+$")
    private String liveDemoUrl;
    private LocalDate startDate;
    private LocalDate endDate;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getGithubUrl() {
        return githubUrl;
    }

    public void setGithubUrl(String githubUrl) {
        this.githubUrl = githubUrl;
    }

    public String getLiveDemoUrl() {
        return liveDemoUrl;
    }

    public void setLiveDemoUrl(String liveDemoUrl) {
        this.liveDemoUrl = liveDemoUrl;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }
}
