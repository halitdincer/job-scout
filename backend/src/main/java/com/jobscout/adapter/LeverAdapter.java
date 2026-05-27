package com.jobscout.adapter;

import com.jobscout.domain.ListingStatus;
import com.jobscout.domain.Platform;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
class LeverAdapter implements Adapter {

    private static final String BASE_URL = "https://api.lever.co/v0/postings";

    private final RestClient http;

    LeverAdapter(@Qualifier("adapterRestClient") RestClient http) {
        this.http = http;
    }

    @Override
    public Platform platform() { return Platform.LEVER; }

    @Override
    @SuppressWarnings("unchecked")
    public List<FetchedListing> fetchListings(String boardId) {
        List<Map<String, Object>> postings = http.get()
            .uri(BASE_URL + "/{board}?mode=json", boardId)
            .retrieve()
            .body(List.class);

        if (postings == null) return List.of();

        List<FetchedListing> out = new ArrayList<>(postings.size());
        for (Map<String, Object> p : postings) {
            Map<String, Object> categories =
                (Map<String, Object>) p.getOrDefault("categories", Map.of());
            List<String> allLocations =
                (List<String>) categories.getOrDefault("allLocations", List.of());

            Instant publishedAt = null;
            Object created = p.get("createdAt");
            if (created instanceof Number n) {
                publishedAt = Instant.ofEpochMilli(n.longValue());
            }

            out.add(new FetchedListing(
                String.valueOf(p.get("id")),
                (String) p.get("text"),
                (String) p.get("hostedUrl"),
                allLocations,
                ListingStatus.ACTIVE,
                publishedAt,
                null
            ));
        }
        return out;
    }
}
