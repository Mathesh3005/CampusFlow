package com.campusflow.controller;

import com.campusflow.dto.admin.CreatePlacementOfficerRequest;
import com.campusflow.dto.admin.PlacementOfficerAdminResponseDto;
import com.campusflow.dto.common.PageResponseDto;
import com.campusflow.service.AdminOfficerService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;

@RestController
@RequestMapping("/api/v1/admin/officers")
@PreAuthorize("hasRole('ADMIN')")
public class AdminOfficerController {

    private static final Set<String> SORTABLE_FIELDS = Set.of(
            "fullName", "employeeId", "department", "createdAt", "updatedAt");

    private final AdminOfficerService officers;

    public AdminOfficerController(AdminOfficerService officers) {
        this.officers = officers;
    }

    @GetMapping
    public PageResponseDto<PlacementOfficerAdminResponseDto> list(
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "fullName", direction = Sort.Direction.ASC) Pageable pageable) {
        validateSort(pageable);
        return PageResponseDto.from(officers.listOfficers(search, pageable));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PlacementOfficerAdminResponseDto create(@Valid @RequestBody CreatePlacementOfficerRequest request) {
        return officers.createOfficer(request);
    }

    @PatchMapping("/{id}/activate")
    public PlacementOfficerAdminResponseDto activate(@PathVariable Long id) {
        return officers.setActive(id, true);
    }

    @PatchMapping("/{id}/deactivate")
    public PlacementOfficerAdminResponseDto deactivate(@PathVariable Long id) {
        return officers.setActive(id, false);
    }

    private static void validateSort(Pageable pageable) {
        for (Sort.Order order : pageable.getSort()) {
            if (!SORTABLE_FIELDS.contains(order.getProperty())) {
                throw new IllegalArgumentException("Unsupported officer sort field: " + order.getProperty());
            }
        }
    }
}
