package com.campusflow.service;

import com.campusflow.entity.ApplicationStatus;
import com.campusflow.entity.PlacementOfficer;
import com.campusflow.entity.User;
import com.campusflow.repository.ApplicationRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DepartmentPlacementAnalyticsServiceTest {
    @Test
    void reportsApplicationCountsAndSelectedApplicationRateForOfficer() {
        ApplicationRepository applications = mock(ApplicationRepository.class);
        PlacementOfficer officer = officerWithUserId(42L);
        when(applications.getDepartmentPlacementStatistics(42L,
                ApplicationStatus.SHORTLISTED, ApplicationStatus.SELECTED))
                .thenReturn(List.<Object[]>of(new Object[]{"Engineering", 5L, 3L, 2L}));

        var result = new DepartmentPlacementAnalyticsService(applications)
                .getDepartmentPlacements(officer);

        assertEquals(1, result.size());
        assertEquals(5L, result.getFirst().getTotalApplications());
        assertEquals(3L, result.getFirst().getShortlistedApplications());
        assertEquals(2L, result.getFirst().getSelectedApplications());
        assertEquals(new BigDecimal("40.00"), result.getFirst().getPlacementRate());
        verify(applications).getDepartmentPlacementStatistics(42L,
                ApplicationStatus.SHORTLISTED, ApplicationStatus.SELECTED);
    }

    private static PlacementOfficer officerWithUserId(long userId) {
        PlacementOfficer officer = mock(PlacementOfficer.class);
        User user = mock(User.class);
        when(officer.getUser()).thenReturn(user);
        when(user.getId()).thenReturn(userId);
        return officer;
    }
}
