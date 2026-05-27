package com.jobscout.adapter;

import com.jobscout.domain.ListingStatus;
import com.jobscout.domain.Platform;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
class BambooHRAdapter implements Adapter {

    private final RestClient http;

    BambooHRAdapter(@Qualifier("adapterRestClient") RestClient http) {
        this.http = http;
    }

    @Override
    public Platform platform() { return Platform.BAMBOOHR; }

    @Override
    @SuppressWarnings("unchecked")
    public List<FetchedListing> fetchListings(String boardId) {
        String url = "https://" + boardId + ".bamboohr.com/careers/list";
        Map<String, Object> body = http.get()
            .uri(url)
            .accept(MediaType.APPLICATION_JSON)
            .retrieve()
            .body(Map.class);

        List<Map<String, Object>> jobs = body == null
            ? List.of()
            : (List<Map<String, Object>>) body.getOrDefault("result", List.of());

        List<FetchedListing> out = new ArrayList<>(jobs.size());
        for (Map<String, Object> job : jobs) {
            String jobId = String.valueOf(job.get("id"));
            out.add(new FetchedListing(
                jobId,
                (String) job.get("jobOpeningName"),
                "https://" + boardId + ".bamboohr.com/careers/" + jobId,
                normalizeLocations(job),
                ListingStatus.ACTIVE,
                null,
                null
            ));
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    private static List<String> normalizeLocations(Map<String, Object> job) {
        Set<String> out = new LinkedHashSet<>();
        Map<String, Object> location =
            (Map<String, Object>) (job.getOrDefault("location", Map.of()));
        Map<String, Object> atsLocation =
            (Map<String, Object>) (job.getOrDefault("atsLocation", Map.of()));

        String city = strOrNull(location.get("city"));
        String state = strOrNull(location.get("state"));
        if (city != null && state != null) out.add(city + ", " + state);
        else if (city != null) out.add(city);
        else if (state != null) out.add(state);

        if (out.isEmpty()) {
            String atsCity = strOrNull(atsLocation.get("city"));
            String atsState = strOrNull(atsLocation.get("state"));
            if (atsState == null) atsState = strOrNull(atsLocation.get("province"));
            String atsCountry = strOrNull(atsLocation.get("country"));
            if (atsCity != null && atsState != null) out.add(atsCity + ", " + atsState);
            else if (atsCity != null) out.add(atsCity);
            else if (atsState != null) out.add(atsState);
            else if (atsCountry != null) out.add(atsCountry);
        }
        return List.copyOf(out);
    }

    private static String strOrNull(Object value) {
        if (value instanceof String s && !s.isBlank()) return s.trim();
        return null;
    }
}
