package com.campusflow.dto.analytics;

import java.math.BigDecimal;

public class DepartmentPlacementResponseDto {

    private String department;
    private Long totalApplications;
    private Long shortlistedApplications;
    private Long selectedApplications;
    private BigDecimal placementRate;

    public DepartmentPlacementResponseDto() {
    }

    public DepartmentPlacementResponseDto(
            String department,
            Long totalApplications,
            Long shortlistedApplications,
            Long selectedApplications,
            BigDecimal placementRate
    ) {
        this.department = department;
        this.totalApplications = totalApplications;
        this.shortlistedApplications = shortlistedApplications;
        this.selectedApplications = selectedApplications;
        this.placementRate = placementRate;
    }

    public String getDepartment() {
        return department;
    }

    public Long getTotalApplications() {
        return totalApplications;
    }

    public Long getShortlistedApplications() {
        return shortlistedApplications;
    }

    public Long getSelectedApplications() {
        return selectedApplications;
    }

    public BigDecimal getPlacementRate() {
        return placementRate;
    }
}
