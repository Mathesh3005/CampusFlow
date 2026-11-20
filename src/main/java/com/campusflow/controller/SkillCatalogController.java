package com.campusflow.controller;

import com.campusflow.dto.skill.SkillResponseDto;
import com.campusflow.service.SkillService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/skills")
@PreAuthorize("hasAnyRole('STUDENT', 'PLACEMENT_OFFICER', 'ADMIN')")
public class SkillCatalogController {
    private final SkillService skills;

    public SkillCatalogController(SkillService skills) { this.skills = skills; }

    @GetMapping
    public List<SkillResponseDto> list() {
        return skills.getAllSkills().stream().map(skill -> {
            SkillResponseDto response = new SkillResponseDto();
            response.setId(skill.getId());
            response.setName(skill.getName());
            return response;
        }).toList();
    }
}
