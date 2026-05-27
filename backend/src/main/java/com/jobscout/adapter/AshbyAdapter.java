package com.jobscout.adapter;

import com.jobscout.domain.ListingStatus;
import com.jobscout.domain.Platform;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
class AshbyAdapter implements Adapter {

    private static final String BASE_URL =
        "https://api.ashbyhq.com/posting-api/job-board";

    private final RestClient http;

    AshbyAdapter(@Qualifier("adapterRestClient") RestClient http) {
        this.http = http;
    }

    @Override
    public Platform platform() { return Platform.ASHBY; }

    @Override
    @SuppressWarnings("unchecked")
    public List<FetchedListing> fetchListings(String boardId) {
        Map<String, Object> body = http.get()
            .uri(BASE_URL + "/{board}", boardId)
            .retrieve()
            .body(Map.class);

        List<Map<String, Object>> jobs = body == null
            ? List.of()
            : (List<Map<String, Object>>) body.getOrDefault("jobs", List.of());

        List<FetchedListing> out = new ArrayList<>(jobs.size());
        for (Map<String, Object> job : jobs) {
            // is_listed is the only signal we still consume; map to status.
            Object listed = job.get("isListed");
            ListingStatus status = Boolean.FALSE.equals(listed)
                ? ListingStatus.EXPIRED
                : ListingStatus.ACTIVE;

            out.add(new FetchedListing(
                String.valueOf(job.get("id")),
                (String) job.get("title"),
                (String) job.get("jobUrl"),
                normalizeLocations(job),
                status,
                parseInstant((String) job.get("publishedAt")),
                null
            ));
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    private static List<String> normalizeLocations(Map<String, Object> job) {
        Set<String> out = new LinkedHashSet<>();
        Object primary = job.get("location");
        if (primary instanceof String s && !s.isBlank()) out.add(s.trim());

        Object secondary = job.get("secondaryLocations");
        if (secondary instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof String s && !s.isBlank()) {
                    out.add(s.trim());
                } else if (item instanceof Map<?, ?> m) {
                    Object raw = m.get("location");
                    if (raw instanceof String s && !s.isBlank()) {
                        out.add(s.trim());
                    }
                }
            }
        }
        return List.copyOf(out);
    }

    private static Instant parseInstant(String s) {
        if (s == null || s.isBlank()) return null;
        try { return Instant.parse(s); }
        catch (Exception e) { return null; }
    }
}
