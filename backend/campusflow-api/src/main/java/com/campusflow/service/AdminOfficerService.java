package com.campusflow.service;

import com.campusflow.dto.admin.CreatePlacementOfficerRequest;
import com.campusflow.dto.admin.PlacementOfficerAdminResponseDto;
import com.campusflow.entity.PlacementOfficer;
import com.campusflow.entity.Role;
import com.campusflow.entity.User;
import com.campusflow.repository.PlacementOfficerRepository;
import com.campusflow.repository.PlacementOfficerSpecifications;
import com.campusflow.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Service
public class AdminOfficerService {

    private final UserRepository users;
    private final PlacementOfficerRepository officers;
    private final PasswordEncoder passwords;

    public AdminOfficerService(UserRepository users, PlacementOfficerRepository officers, PasswordEncoder passwords) {
        this.users = users;
        this.officers = officers;
        this.passwords = passwords;
    }

    @Transactional(readOnly = true)
    public Page<PlacementOfficerAdminResponseDto> listOfficers(String search, Pageable pageable) {
        return officers.findAll(PlacementOfficerSpecifications.matchesSearch(search), pageable)
                .map(PlacementOfficerAdminResponseDto::from);
    }

    @Transactional
    public PlacementOfficerAdminResponseDto createOfficer(CreatePlacementOfficerRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String employeeId = request.employeeId().trim();
        if (users.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        }
        if (officers.existsByEmployeeId(employeeId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Employee ID is already registered");
        }

        User user = users.save(new User(email, passwords.encode(request.password()), Role.PLACEMENT_OFFICER));
        PlacementOfficer officer = new PlacementOfficer(user, employeeId, request.fullName().trim());
        officer.setDepartment(trimToNull(request.department()));
        officer.setPhone(trimToNull(request.phone()));
        return PlacementOfficerAdminResponseDto.from(officers.save(officer));
    }

    @Transactional
    public PlacementOfficerAdminResponseDto setActive(Long officerId, boolean active) {
        PlacementOfficer officer = officers.findById(officerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Placement officer not found"));
        officer.getUser().setIsActive(active);
        users.save(officer.getUser());
        return PlacementOfficerAdminResponseDto.from(officer);
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
