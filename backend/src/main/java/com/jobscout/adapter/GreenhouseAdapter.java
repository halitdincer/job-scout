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
class GreenhouseAdapter implements Adapter {

    private static final String BASE_URL =
        "https://boards-api.greenhouse.io/v1/boards";

    private final RestClient http;

    GreenhouseAdapter(@Qualifier("adapterRestClient") RestClient http) {
        this.http = http;
    }

    @Override
    public Platform platform() { return Platform.GREENHOUSE; }

    @Override
    @SuppressWarnings("unchecked")
    public List<FetchedListing> fetchListings(String boardId) {
        Map<String, Object> body = http.get()
            .uri(BASE_URL + "/{board}/jobs?content=true", boardId)
            .retrieve()
            .body(Map.class);

        List<Map<String, Object>> jobs = body == null
            ? List.of()
            : (List<Map<String, Object>>) body.getOrDefault("jobs", List.of());

        List<FetchedListing> out = new ArrayList<>(jobs.size());
        for (Map<String, Object> job : jobs) {
            Map<String, Object> loc = (Map<String, Object>) job.get("location");
            String locName = loc == null ? null : (String) loc.get("name");

            out.add(new FetchedListing(
                String.valueOf(job.get("id")),
                (String) job.get("title"),
                (String) job.get("absolute_url"),
                locName == null ? List.of() : List.of(locName),
                ListingStatus.ACTIVE,
                parseInstant((String) job.get("first_published")),
                parseInstant((String) job.get("updated_at"))
            ));
        }
        return out;
    }

    private static Instant parseInstant(String s) {
        if (s == null || s.isBlank()) return null;
        try { return Instant.parse(s); }
        catch (Exception e) { return null; }
    }
}
