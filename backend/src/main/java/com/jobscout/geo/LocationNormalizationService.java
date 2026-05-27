package com.jobscout.geo;

import com.jobscout.domain.Platform;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

/**
 * Pure-logic port of {@code core/location_normalization.py}.
 * <p>
 * Splits composite location strings, applies per-source profiles, and dedupes
 * across all raw values for a listing. No I/O.
 */
@Service
public class LocationNormalizationService {

    private static final Pattern COMPOSITE_SPLIT = Pattern.compile(
        "\\s+or\\s+|\\s+/\\s+|;|\\s*\\|\\s*|\\s*[•·]\\s*",
        Pattern.CASE_INSENSITIVE
    );

    private static final Pattern CITY_STATE_COUNTRY =
        Pattern.compile("^[A-Za-z .'\\-]+, [A-Z]{2}(, [A-Z]{2})?$");

    private static final Pattern REMOTE_VARIANT = Pattern.compile(
        "^(Remote|US[- ]?Remote|CA[- ]?Remote|Canada[- ]?Remote|"
            + "Remote[ -]US|Remote[ -]Canada|Remote in .+)$",
        Pattern.CASE_INSENSITIVE
    );

    private static final Map<ProfileKey, String> PROFILE_REGISTRY = Map.of(
        new ProfileKey(Platform.GREENHOUSE, "stripe"), "stripe"
    );

    private record ProfileKey(Platform platform, String boardId) {}

    public String parsingProfile(Platform platform, String boardId) {
        return PROFILE_REGISTRY.getOrDefault(
            new ProfileKey(platform, boardId), "default");
    }

    public List<String> normalizeValues(List<String> rawValues, String profile) {
        Set<String> seen = new LinkedHashSet<>();
        if (rawValues == null) return List.of();
        for (String raw : rawValues) {
            for (String token : normalizeValue(raw, profile)) {
                seen.add(token);
            }
        }
        return List.copyOf(seen);
    }

    public List<String> normalizeValue(String raw, String profile) {
        if (raw == null) return List.of();
        String text = raw.strip();
        if (text.isEmpty()) return List.of();

        if (text.startsWith("{") && text.endsWith("}")) {
            String extracted = extractDictLocation(text);
            return extracted == null ? List.of() : splitComposite(extracted);
        }

        if ("stripe".equals(profile)) return splitStripe(text);
        return splitComposite(text);
    }

    private static List<String> splitComposite(String value) {
        if (value == null) return List.of();
        String[] tokens = COMPOSITE_SPLIT.split(value);
        List<String> out = new ArrayList<>(tokens.length);
        for (String t : tokens) {
            String stripped = t.strip();
            if (!stripped.isEmpty()) out.add(stripped);
        }
        return out;
    }

    private static List<String> splitStripe(String text) {
        List<String> baseTokens = splitComposite(text);
        if (baseTokens.size() != 1 || !baseTokens.get(0).equals(text)) {
            return baseTokens;
        }
        if (CITY_STATE_COUNTRY.matcher(text).matches()) return List.of(text);
        if (REMOTE_VARIANT.matcher(text).matches())    return List.of(text);

        String[] parts = text.split(",");
        List<String> nonEmpty = new ArrayList<>();
        for (String p : parts) {
            String s = p.strip();
            if (!s.isEmpty()) nonEmpty.add(s);
        }
        return nonEmpty.size() >= 2 ? nonEmpty : List.of(text);
    }

    /**
     * Best-effort extraction of {@code {'location': '...'}}-style strings some
     * sources emit. Handles both single and double quotes.
     */
    private static final Pattern DICT_LOCATION = Pattern.compile(
        "['\"]location['\"]\\s*:\\s*['\"]([^'\"]+)['\"]"
    );

    private static String extractDictLocation(String text) {
        var matcher = DICT_LOCATION.matcher(text);
        return matcher.find() ? matcher.group(1) : null;
    }
}
