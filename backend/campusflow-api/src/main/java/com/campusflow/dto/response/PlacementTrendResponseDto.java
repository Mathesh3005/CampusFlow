package com.campusflow.dto.response;

import java.math.BigDecimal;

public class PlacementTrendResponseDto {

    private Integer graduationYear;
    private Long totalApplications;
    private Long selectedApplications;
    private BigDecimal placementRate;

    public PlacementTrendResponseDto(
            Integer graduationYear,
            Long totalApplications,
            Long selectedApplications,
            BigDecimal placementRate) {
        this.graduationYear = graduationYear;
        this.totalApplications = totalApplications;
        this.selectedApplications = selectedApplications;
        this.placementRate = placementRate;
    }

    public Integer getGraduationYear() {
        return graduationYear;
    }

    public Long getTotalApplications() {
        return totalApplications;
    }

    public Long getSelectedApplications() {
        return selectedApplications;
    }

    public BigDecimal getPlacementRate() {
        return placementRate;
    }
}
