package com.jobscout.geo;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Thin Nominatim wrapper.
 * <p>
 * Stateless: no caching or persistence. {@code LocationGeocoderJob} is
 * responsible for batching, retry policy, and updating {@code LocationTag}.
 */
@Component
public class GeoClient {

    private final RestClient http;
    private final String userAgent;

    public GeoClient(@Qualifier("adapterRestClient") RestClient http,
                     @Value("${jobscout.geo.user-agent:job-scout/1.0 contact@jobscout}")
                     String userAgent) {
        this.http = http;
        this.userAgent = userAgent;
    }

    /**
     * Resolve a free-text location to country/region/city. Returns
     * {@link GeoResult#empty()} when Nominatim returns no match.
     *
     * @throws RestClientException for transient HTTP/network failures so the
     *                             scheduled geocoder can record a retryable failure.
     */
    @SuppressWarnings("unchecked")
    public GeoResult geocode(String query) {
        if (query == null || query.isBlank()) return GeoResult.empty();
        String cleaned = clean(query);
        if (cleaned.isBlank()) return GeoResult.empty();

        List<Map<String, Object>> results = http.get()
            .uri("https://nominatim.openstreetmap.org/search?q={q}&format=jsonv2&addressdetails=1&limit=1",
                cleaned)
            .accept(MediaType.APPLICATION_JSON)
            .header("User-Agent", userAgent)
            .retrieve()
            .body(List.class);

        if (results == null || results.isEmpty()) return GeoResult.empty();
        Map<String, Object> first = results.get(0);
        Map<String, Object> addr =
            (Map<String, Object>) first.getOrDefault("address", Map.of());

        String countryCode = asUpper((String) addr.get("country_code"));
        String regionCode = inferRegionCode(countryCode, addr);
        String city = pickCity(addr);

        return new GeoResult(countryCode, regionCode, city);
    }

    private static String clean(String value) {
        // Strip common ATS noise that confuses Nominatim.
        return value
            .replaceAll("(?i)\\bremote\\b", "")
            .replaceAll("(?i)\\bhybrid\\b", "")
            .replaceAll("(?i)\\b(on[- ]?site|in[- ]?office)\\b", "")
            .replaceAll("\\s+", " ")
            .strip();
    }

    private static String asUpper(String s) {
        return s == null ? null : s.toUpperCase();
    }

    private static String inferRegionCode(String country, Map<String, Object> addr) {
        Object iso = addr.get("ISO3166-2-lvl4");
        if (iso instanceof String s && !s.isBlank()) return s;
        Object state = addr.get("state");
        if (country != null && state instanceof String s && !s.isBlank()) {
            return country + "-" + s;
        }
        return null;
    }

    private static String pickCity(Map<String, Object> addr) {
        for (String key : new String[]{"city", "town", "village", "municipality", "county"}) {
            Object v = addr.get(key);
            if (v instanceof String s && !s.isBlank()) return s;
        }
        return null;
    }
}
