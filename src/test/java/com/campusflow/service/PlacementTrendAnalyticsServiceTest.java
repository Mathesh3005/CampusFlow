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

class PlacementTrendAnalyticsServiceTest {
    @Test
    void calculatesPlacementRateFromSelectedAndTotalApplications() {
        ApplicationRepository applications = mock(ApplicationRepository.class);
        PlacementOfficer officer = mock(PlacementOfficer.class);
        User user = mock(User.class);
        when(officer.getUser()).thenReturn(user);
        when(user.getId()).thenReturn(24L);
        when(applications.getPlacementTrendsByGraduationYear(24L, ApplicationStatus.SELECTED))
                .thenReturn(List.<Object[]>of(new Object[]{2028, 4L, 1L}));

        var result = new PlacementTrendAnalyticsService(applications).getPlacementTrends(officer);

        assertEquals(2028, result.getFirst().getGraduationYear());
        assertEquals(4L, result.getFirst().getTotalApplications());
        assertEquals(1L, result.getFirst().getSelectedApplications());
        assertEquals(new BigDecimal("25.00"), result.getFirst().getPlacementRate());
        verify(applications).getPlacementTrendsByGraduationYear(24L, ApplicationStatus.SELECTED);
    }
}
