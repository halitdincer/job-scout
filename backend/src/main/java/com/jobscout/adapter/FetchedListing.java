package com.jobscout.adapter;

import com.jobscout.domain.ListingStatus;
import java.time.Instant;
import java.util.List;

/**
 * Trimmed internal DTO returned by every {@link Adapter}.
 * <p>
 * Dropped vs the old Django contract: {@code department}, {@code team},
 * {@code employmentType}, {@code workplaceType}, {@code country},
 * {@code isListed}. Country is derived during geocoding; isListed is merged
 * into {@link #status()} at the adapter boundary.
 */
public record FetchedListing(
    String externalId,
    String title,
    String url,
    List<String> locations,
    ListingStatus status,
    Instant publishedAt,
    Instant updatedAtSource
) {
    public FetchedListing {
        // Defensive copy + null safety
        locations = locations == null ? List.of() : List.copyOf(locations);
        if (status == null) status = ListingStatus.ACTIVE;
    }
}
