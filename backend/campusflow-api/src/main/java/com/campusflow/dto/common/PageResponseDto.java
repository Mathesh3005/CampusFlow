package com.campusflow.dto.common;

import org.springframework.data.domain.Page;

import java.util.List;

/** Stable API representation of a Spring Data page. */
public class PageResponseDto<T> {
    private final List<T> content;
    private final int page;
    private final int size;
    private final long totalElements;
    private final int totalPages;
    private final boolean first;
    private final boolean last;
    private final boolean hasNext;
    private final boolean hasPrevious;

    private PageResponseDto(Page<T> source) {
        this.content = List.copyOf(source.getContent());
        this.page = source.getNumber();
        this.size = source.getSize();
        this.totalElements = source.getTotalElements();
        this.totalPages = source.getTotalPages();
        this.first = source.isFirst();
        this.last = source.isLast();
        this.hasNext = source.hasNext();
        this.hasPrevious = source.hasPrevious();
    }

    public static <T> PageResponseDto<T> from(Page<T> page) {
        return new PageResponseDto<>(page);
    }

    public List<T> getContent() { return content; }
    public int getPage() { return page; }
    public int getSize() { return size; }
    public long getTotalElements() { return totalElements; }
    public int getTotalPages() { return totalPages; }
    public boolean isFirst() { return first; }
    public boolean isLast() { return last; }
    public boolean isHasNext() { return hasNext; }
    public boolean isHasPrevious() { return hasPrevious; }
}
