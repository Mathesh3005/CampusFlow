package com.campusflow.service;

import com.campusflow.entity.PlacementOfficer;
import com.campusflow.entity.User;
import com.campusflow.repository.PlacementOfficerRepository;
import com.campusflow.repository.UserRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class PlacementOfficerService {

    private final PlacementOfficerRepository placementOfficerRepository;
    private final UserRepository userRepository;

    public PlacementOfficerService(
            PlacementOfficerRepository placementOfficerRepository,
            UserRepository userRepository) {
        this.placementOfficerRepository = placementOfficerRepository;
        this.userRepository = userRepository;
    }

    public PlacementOfficer createPlacementOfficer(
            PlacementOfficer placementOfficer) {

        if (placementOfficer == null) {
            throw new IllegalArgumentException(
                    "Placement officer cannot be null");
        }

        if (placementOfficer.getUser() == null
                || placementOfficer.getUser().getId() == null) {
            throw new IllegalArgumentException(
                    "A valid user account is required");
        }

        Long userId = placementOfficer.getUser().getId();

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new IllegalArgumentException("User not found"));

        if (placementOfficerRepository.existsByUserId(userId)) {
            throw new IllegalArgumentException(
                    "Placement officer profile already exists");
        }

        placementOfficer.setUser(user);

        return placementOfficerRepository.save(placementOfficer);
    }

    @Transactional(readOnly = true)
    public Optional<PlacementOfficer> getPlacementOfficerById(
            Long officerId) {
        return placementOfficerRepository.findById(officerId);
    }

    @Transactional(readOnly = true)
    public Optional<PlacementOfficer> getPlacementOfficerByUserId(
            Long userId) {
        return placementOfficerRepository.findByUserId(userId);
    }

    @Transactional(readOnly = true)
    public List<PlacementOfficer> getAllPlacementOfficers() {
        return placementOfficerRepository.findAll();
    }

    public PlacementOfficer updatePlacementOfficer(
            Long officerId,
            PlacementOfficer updatedOfficer) {

        if (updatedOfficer == null) {
            throw new IllegalArgumentException(
                    "Updated details cannot be null");
        }

        PlacementOfficer existingOfficer =
                placementOfficerRepository.findById(officerId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Placement officer not found"));

        existingOfficer.setEmployeeId(updatedOfficer.getEmployeeId());
        existingOfficer.setFullName(updatedOfficer.getFullName());
        existingOfficer.setDepartment(updatedOfficer.getDepartment());
        existingOfficer.setPhone(updatedOfficer.getPhone());

        return placementOfficerRepository.save(existingOfficer);
    }

    public void deletePlacementOfficer(Long officerId) {

        PlacementOfficer officer =
                placementOfficerRepository.findById(officerId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Placement officer not found"));

        placementOfficerRepository.delete(officer);
    }
}