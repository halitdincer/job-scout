package com.jobscout.geo;

import com.jobscout.domain.LocationTag;
import com.jobscout.repository.LocationTagRepository;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Decouples geocoding from ingestion. Periodically picks up {@link LocationTag}s
 * that haven't been resolved yet and calls Nominatim, with a per-tag failure
 * counter so we stop retrying tags that are unparseable.
 * <p>
 * Failures are NO LONGER silent: the {@code geocoding_failures} column makes
 * problem tags queryable.
 */
@Component
public class LocationGeocoderJob {

    private static final Logger log = LoggerFactory.getLogger(LocationGeocoderJob.class);

    private final LocationTagRepository repo;
    private final GeoClient client;
    private final Settings settings;

    public LocationGeocoderJob(LocationTagRepository repo,
                               GeoClient client,
                               Settings settings) {
        this.repo = repo;
        this.client = client;
        this.settings = settings;
    }

    @Scheduled(fixedDelayString = "${jobscout.geo.scheduler.delay-ms:300000}",
               initialDelayString = "${jobscout.geo.scheduler.initial-ms:30000}")
    @Transactional
    public void runOnce() {
        List<LocationTag> batch = repo
            .findTop50ByCountryCodeIsNullAndGeocodingFailuresLessThanOrderById(
                settings.getMaxFailures());
        if (batch.isEmpty()) return;
        log.info("Geocoding batch of {} location tags", batch.size());

        for (LocationTag tag : batch) {
            try {
                GeoResult r = client.geocode(tag.getName());
                if (r == null || r.countryCode() == null) {
                    tag.setGeocodingFailures(tag.getGeocodingFailures() + 1);
                    log.warn("No geocode result for '{}'", tag.getName());
                } else {
                    tag.setCountryCode(r.countryCode());
                    tag.setRegionCode(r.regionCode());
                    tag.setCity(r.city());
                    tag.setGeocodedAt(Instant.now());
                    tag.setGeocodingFailures(0);
                }
            } catch (Exception e) {
                tag.setGeocodingFailures(tag.getGeocodingFailures() + 1);
                log.warn("Geocoding failed for '{}': {}", tag.getName(), e.getMessage());
            }
            repo.save(tag);
        }
    }

    @Component
    @ConfigurationProperties(prefix = "jobscout.geo")
    public static class Settings {
        /** Max consecutive failures before we stop retrying a tag. */
        private int maxFailures = 3;
        public int getMaxFailures() { return maxFailures; }
        public void setMaxFailures(int v) { maxFailures = v; }
    }
}
