package com.jobscout.mapper;

import com.jobscout.api.generated.model.JobListing;
import com.jobscout.api.generated.model.JobListingPage;
import com.jobscout.api.generated.model.ListingStatus;
import java.net.URI;
import java.util.List;
import java.util.Set;
import org.springframework.data.domain.Page;

public final class JobListingMapper {
    private JobListingMapper() {}

    public static JobListing toDto(com.jobscout.domain.JobListing entity, Set<Long> seenIds) {
        JobListing dto = new JobListing(
            entity.getId(),
            entity.getSource().getId(),
            entity.getSource().getName(),
            entity.getExternalId(),
            entity.getTitle(),
            URI.create(entity.getUrl()),
            ListingStatus.valueOf(entity.getStatus().name()),
            entity.getLocations().stream().map(LocationTagMapper::toDto).toList(),
            Times.toOffset(entity.getFirstSeenAt()),
            Times.toOffset(entity.getLastSeenAt()),
            seenIds.contains(entity.getId())
        );
        dto.setPublishedAt(Times.toOffset(entity.getPublishedAt()));
        dto.setUpdatedAtSource(Times.toOffset(entity.getUpdatedAtSource()));
        dto.setExpiredAt(Times.toOffset(entity.getExpiredAt()));
        return dto;
    }

    public static JobListingPage toPage(Page<com.jobscout.domain.JobListing> page, Set<Long> seenIds) {
        List<JobListing> items = page.getContent().stream()
            .map(e -> toDto(e, seenIds))
            .toList();
        return new JobListingPage(
            items,
            page.getNumber(),
            page.getSize(),
            (int) page.getTotalElements(),
            page.hasNext()
        );
    }
}
