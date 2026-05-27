package com.jobscout.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Sort;

/**
 * Parses `field:dir` tokens from the {@code sort} query parameter into a
 * {@link Sort}. The {@code seen} pseudo-field is excluded here and handled at
 * the controller level with a derived expression (LEFT JOIN seen_listing).
 */
public final class SortParser {

    /** Maps DSL sort fields to entity attribute paths. */
    private static final Map<String, String> FIELDS = Map.ofEntries(
        Map.entry("title", "title"),
        Map.entry("status", "status"),
        Map.entry("published_at", "publishedAt"),
        Map.entry("first_seen_at", "firstSeenAt"),
        Map.entry("last_seen_at", "lastSeenAt"),
        Map.entry("updated_at_source", "updatedAtSource"),
        Map.entry("expired_at", "expiredAt"),
        Map.entry("source_name", "source.name"),
        Map.entry("external_id", "externalId")
    );

    private SortParser() {}

    public static Sort parse(List<String> tokens) {
        if (tokens == null || tokens.isEmpty()) {
            return Sort.by(Sort.Order.desc("firstSeenAt"));
        }
        List<Sort.Order> orders = new ArrayList<>(tokens.size());
        for (String raw : tokens) {
            String token = raw.strip();
            if (token.isEmpty()) continue;
            String field = token;
            Sort.Direction dir = Sort.Direction.ASC;
            int colon = token.indexOf(':');
            if (colon > 0) {
                field = token.substring(0, colon);
                dir = "desc".equalsIgnoreCase(token.substring(colon + 1))
                    ? Sort.Direction.DESC : Sort.Direction.ASC;
            }
            // The "seen" pseudo-field is handled at the controller layer; skip here.
            if ("seen".equals(field)) continue;
            String path = FIELDS.get(field);
            if (path == null) {
                throw new IllegalArgumentException("Sort field unknown: " + field);
            }
            orders.add(new Sort.Order(dir, path));
        }
        return orders.isEmpty()
            ? Sort.by(Sort.Order.desc("firstSeenAt"))
            : Sort.by(orders);
    }

    /** Returns true if the token list requested a sort by {@code seen}. */
    public static boolean wantsSeenSort(List<String> tokens) {
        if (tokens == null) return false;
        for (String raw : tokens) {
            String token = raw.strip();
            int colon = token.indexOf(':');
            String field = colon > 0 ? token.substring(0, colon) : token;
            if ("seen".equals(field)) return true;
        }
        return false;
    }
}
