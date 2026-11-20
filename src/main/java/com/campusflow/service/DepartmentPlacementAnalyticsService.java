package com.campusflow.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.campusflow.dto.analytics.DepartmentPlacementResponseDto;
import com.campusflow.entity.ApplicationStatus;
import com.campusflow.entity.PlacementOfficer;
import com.campusflow.repository.ApplicationRepository;

@Service
public class DepartmentPlacementAnalyticsService {

    private final ApplicationRepository applicationRepository;

    public DepartmentPlacementAnalyticsService(
            ApplicationRepository applicationRepository) {
        this.applicationRepository = applicationRepository;
    }

    @Transactional(readOnly = true)
    public List<DepartmentPlacementResponseDto> getDepartmentPlacements(
            PlacementOfficer officer) {

        Long userId = officer.getUser().getId();

        List<Object[]> results =
                applicationRepository.getDepartmentPlacementStatistics(
                        userId,
                        ApplicationStatus.SHORTLISTED,
                        ApplicationStatus.SELECTED
                );

        return results.stream()
                .map(this::mapToDto)
                .toList();
    }

    public List<DepartmentPlacementResponseDto> getTopPerformingDepartments(
        PlacementOfficer officer) {

    return getDepartmentPlacements(officer)
            .stream()
            .sorted(
                Comparator.comparing(
                    DepartmentPlacementResponseDto::getPlacementRate
                ).reversed()
                .thenComparing(
                    DepartmentPlacementResponseDto::getSelectedApplications,
                    Comparator.reverseOrder()
                )
            )
            .toList();
}

    private DepartmentPlacementResponseDto mapToDto(Object[] row) {

        String department = (String) row[0];
        Long totalApplications = ((Number) row[1]).longValue();
        Long shortlistedApplications = ((Number) row[2]).longValue();
        Long selectedApplications = ((Number) row[3]).longValue();

        BigDecimal placementRate = BigDecimal.ZERO;

        if (totalApplications > 0) {
            placementRate = BigDecimal.valueOf(selectedApplications)
                    .multiply(BigDecimal.valueOf(100))
                    .divide(
                            BigDecimal.valueOf(totalApplications),
                            2,
                            RoundingMode.HALF_UP
                    );
        }

        return new DepartmentPlacementResponseDto(
                department,
                totalApplications,
                shortlistedApplications,
                selectedApplications,
                placementRate
        );
    }
}
