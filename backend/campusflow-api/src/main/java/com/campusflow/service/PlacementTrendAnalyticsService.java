package com.campusflow.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.campusflow.dto.response.PlacementTrendResponseDto;
import com.campusflow.entity.ApplicationStatus;
import com.campusflow.entity.PlacementOfficer;
import com.campusflow.repository.ApplicationRepository;

@Service
@Transactional(readOnly = true)
public class PlacementTrendAnalyticsService {

    private final ApplicationRepository applicationRepository;

    public PlacementTrendAnalyticsService(
            ApplicationRepository applicationRepository) {
        this.applicationRepository = applicationRepository;
    }

    public List<PlacementTrendResponseDto> getPlacementTrends(
            PlacementOfficer officer) {

        Long userId = officer.getUser().getId();

        List<Object[]> results =
                applicationRepository.getPlacementTrendsByGraduationYear(
                        userId,
                        ApplicationStatus.SELECTED
                );

        return results.stream()
                .map(row -> {

                    Integer graduationYear = (Integer) row[0];
                    Long totalApplications = ((Number) row[1]).longValue();
                    Long selectedApplications = ((Number) row[2]).longValue();

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

                    return new PlacementTrendResponseDto(
                            graduationYear,
                            totalApplications,
                            selectedApplications,
                            placementRate
                    );
                })
                .toList();
    }
}
