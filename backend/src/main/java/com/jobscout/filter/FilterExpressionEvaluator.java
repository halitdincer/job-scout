package com.jobscout.filter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobscout.domain.JobListing;
import com.jobscout.domain.ListingStatus;
import com.jobscout.domain.LocationTag;
import com.jobscout.domain.Source;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

/**
 * Translates the recursive JSON filter DSL described in {@code openapi.yaml}
 * (schema {@code FilterExpression}) into a Spring Data {@link Specification}.
 * <p>
 * The DSL is consumed as a raw JSON string and walked with Jackson, rather
 * than via the auto-generated {@code FilterExpression} interface — the
 * generator's {@code oneOf} output is awkward for discrimination at runtime.
 * The contract documented in the spec is unchanged.
 */
@Service
public class FilterExpressionEvaluator {

    private final ObjectMapper mapper;

    public FilterExpressionEvaluator(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public Specification<JobListing> toSpecification(String filterJson) {
        if (filterJson == null || filterJson.isBlank()) return null;
        final JsonNode root;
        try {
            root = mapper.readTree(filterJson);
        } catch (JsonProcessingException e) {
            throw new InvalidFilterException("Malformed filter JSON: " + e.getOriginalMessage());
        }
        return (r, q, cb) -> buildPredicate(root, r, q, cb);
    }

    private Predicate buildPredicate(JsonNode node, Root<JobListing> root,
                                     CriteriaQuery<?> query, CriteriaBuilder cb) {
        if (node == null || node.isNull()) return cb.conjunction();

        if (node.has("and")) {
            return cb.and(buildChildren(node.get("and"), root, query, cb));
        }
        if (node.has("or")) {
            return cb.or(buildChildren(node.get("or"), root, query, cb));
        }
        if (node.has("not")) {
            return cb.not(buildPredicate(node.get("not"), root, query, cb));
        }
        return buildLeaf(node, root, query, cb);
    }

    private Predicate[] buildChildren(JsonNode arr, Root<JobListing> root,
                                      CriteriaQuery<?> query, CriteriaBuilder cb) {
        if (!arr.isArray() || arr.isEmpty()) {
            throw new InvalidFilterException("Empty boolean group");
        }
        Predicate[] out = new Predicate[arr.size()];
        for (int i = 0; i < arr.size(); i++) {
            out[i] = buildPredicate(arr.get(i), root, query, cb);
        }
        return out;
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private Predicate buildLeaf(JsonNode node, Root<JobListing> root,
                                CriteriaQuery<?> query, CriteriaBuilder cb) {
        String field = node.path("field").asText(null);
        String op = node.path("op").asText(null);
        if (field == null || op == null) {
            throw new InvalidFilterException("Predicate missing field/op");
        }
        JsonNode value = node.get("value");

        return switch (field) {
            case "title" -> stringPredicate(root.get("title"), op, value, cb);
            case "source_name" -> {
                Join<JobListing, Source> j = root.join("source");
                yield stringPredicate(j.get("name"), op, value, cb);
            }
            case "status" -> enumPredicate(
                root.get("status"), op, value, ListingStatus.class, cb);
            case "published_at" -> datePredicate(root.get("publishedAt"), op, value, cb);
            case "first_seen_at" -> datePredicate(root.get("firstSeenAt"), op, value, cb);
            case "last_seen_at" -> datePredicate(root.get("lastSeenAt"), op, value, cb);
            case "location" -> {
                Join<JobListing, LocationTag> loc = root.join("locations");
                yield stringPredicate(loc.get("name"), op, value, cb);
            }
            case "country" -> {
                Join<JobListing, LocationTag> loc = root.join("locations");
                yield stringPredicate(loc.get("countryCode"), op, value, cb);
            }
            case "region" -> {
                Join<JobListing, LocationTag> loc = root.join("locations");
                yield stringPredicate(loc.get("regionCode"), op, value, cb);
            }
            case "city" -> {
                Join<JobListing, LocationTag> loc = root.join("locations");
                yield stringPredicate(loc.get("city"), op, value, cb);
            }
            default -> throw new InvalidFilterException("Unknown field: " + field);
        };
    }

    private Predicate stringPredicate(Path<String> path, String op,
                                      JsonNode value, CriteriaBuilder cb) {
        return switch (op) {
            case "contains"     -> cb.like(cb.lower(path), '%' + asString(value).toLowerCase() + '%');
            case "not_contains" -> cb.notLike(cb.lower(path), '%' + asString(value).toLowerCase() + '%');
            case "eq"           -> cb.equal(path, asString(value));
            case "neq"          -> cb.notEqual(path, asString(value));
            case "in"           -> path.in(asStringList(value));
            case "not_in"       -> cb.not(path.in(asStringList(value)));
            case "is_empty"     -> cb.or(cb.isNull(path), cb.equal(path, ""));
            case "is_not_empty" -> cb.and(cb.isNotNull(path), cb.notEqual(path, ""));
            default -> throw new InvalidFilterException(
                "Operator '" + op + "' not valid for string field");
        };
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private <E extends Enum<E>> Predicate enumPredicate(
        Path<E> path, String op, JsonNode value, Class<E> type, CriteriaBuilder cb) {
        return switch (op) {
            case "eq"  -> cb.equal(path, Enum.valueOf(type, asString(value)));
            case "neq" -> cb.notEqual(path, Enum.valueOf(type, asString(value)));
            case "in" -> {
                List<E> values = new ArrayList<>();
                for (String s : asStringList(value)) values.add(Enum.valueOf(type, s));
                yield path.in(values);
            }
            case "not_in" -> {
                List<E> values = new ArrayList<>();
                for (String s : asStringList(value)) values.add(Enum.valueOf(type, s));
                yield cb.not(path.in(values));
            }
            case "is_empty"     -> cb.isNull(path);
            case "is_not_empty" -> cb.isNotNull(path);
            default -> throw new InvalidFilterException(
                "Operator '" + op + "' not valid for enum field");
        };
    }

    private Predicate datePredicate(Path<Instant> path, String op,
                                    JsonNode value, CriteriaBuilder cb) {
        return switch (op) {
            case "before"        -> cb.lessThan(path, asInstant(value));
            case "after"         -> cb.greaterThan(path, asInstant(value));
            case "in_last_days"  -> cb.greaterThanOrEqualTo(
                path, Instant.now().minus(value.asInt(), ChronoUnit.DAYS));
            case "is_empty"      -> cb.isNull(path);
            case "is_not_empty"  -> cb.isNotNull(path);
            default -> throw new InvalidFilterException(
                "Operator '" + op + "' not valid for date field");
        };
    }

    private static String asString(JsonNode value) {
        if (value == null || value.isNull()) {
            throw new InvalidFilterException("Missing value");
        }
        return value.asText();
    }

    private static List<String> asStringList(JsonNode value) {
        if (value == null || !value.isArray()) {
            throw new InvalidFilterException("Expected array value");
        }
        List<String> out = new ArrayList<>(value.size());
        for (JsonNode v : value) out.add(v.asText());
        return out;
    }

    private static Instant asInstant(JsonNode value) {
        String text = asString(value);
        try {
            return OffsetDateTime.parse(text).toInstant();
        } catch (Exception e) {
            try {
                return Instant.parse(text);
            } catch (Exception e2) {
                throw new InvalidFilterException("Invalid date: " + text);
            }
        }
    }

    public static class InvalidFilterException extends RuntimeException {
        public InvalidFilterException(String msg) { super(msg); }
    }
}
