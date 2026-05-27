package com.jobscout.geo;

/**
 * Resolved geo data for a location string. Any field may be null if Nominatim
 * couldn't resolve it (e.g. country-only matches won't have city).
 */
public record GeoResult(String countryCode, String regionCode, String city) {
    public static GeoResult empty() { return new GeoResult(null, null, null); }
}
