package com.campusflow.dto.common;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class PageResponseDtoTest {
    @Test
    void mapsFirstPageMetadata() {
        var result = PageResponseDto.from(new PageImpl<>(List.of("a", "b"), PageRequest.of(0, 2), 5));

        assertEquals(List.of("a", "b"), result.getContent());
        assertEquals(0, result.getPage());
        assertEquals(2, result.getSize());
        assertEquals(5, result.getTotalElements());
        assertEquals(3, result.getTotalPages());
        assertTrue(result.isFirst());
        assertFalse(result.isLast());
        assertTrue(result.isHasNext());
        assertFalse(result.isHasPrevious());
    }

    @Test
    void mapsMiddlePageMetadata() {
        var result = PageResponseDto.from(new PageImpl<>(List.of("c", "d"), PageRequest.of(1, 2), 5));

        assertEquals(1, result.getPage());
        assertTrue(result.isHasNext());
        assertTrue(result.isHasPrevious());
        assertFalse(result.isFirst());
        assertFalse(result.isLast());
    }

    @Test
    void mapsLastPageMetadataAndTotals() {
        var result = PageResponseDto.from(new PageImpl<>(List.of("e"), PageRequest.of(2, 2), 5));

        assertEquals(5, result.getTotalElements());
        assertEquals(3, result.getTotalPages());
        assertTrue(result.isLast());
        assertFalse(result.isHasNext());
        assertTrue(result.isHasPrevious());
    }

    @Test
    void mapsEmptyPage() {
        var result = PageResponseDto.from(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        assertTrue(result.getContent().isEmpty());
        assertEquals(0, result.getTotalElements());
        assertEquals(0, result.getTotalPages());
        assertTrue(result.isFirst());
        assertTrue(result.isLast());
        assertFalse(result.isHasNext());
        assertFalse(result.isHasPrevious());
    }

    @Test
    void serializesOnlyStablePaginationFieldsAndRetainsPageContentOrder() throws Exception {
        var sortedRequest = PageRequest.of(0, 2, Sort.by(Sort.Direction.ASC, "title"));
        var response = PageResponseDto.from(new PageImpl<>(List.of("First", "Second"), sortedRequest, 2));
        String json = new tools.jackson.databind.ObjectMapper().writeValueAsString(response);

        assertTrue(json.contains("\"content\":[\"First\",\"Second\"]"));
        assertTrue(json.contains("\"page\":0"));
        assertTrue(json.contains("\"size\":2"));
        assertTrue(json.contains("\"totalElements\":2"));
        assertTrue(json.contains("\"totalPages\":1"));
        assertTrue(json.contains("\"first\":true"));
        assertTrue(json.contains("\"last\":true"));
        assertTrue(json.contains("\"hasNext\":false"));
        assertTrue(json.contains("\"hasPrevious\":false"));
        assertFalse(json.contains("pageable"));
        assertFalse(json.contains("sort"));
    }
}
