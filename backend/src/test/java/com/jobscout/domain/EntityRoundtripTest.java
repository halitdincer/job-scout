package com.jobscout.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/**
 * Compile-time smoke test for the domain layer.
 * <p>
 * The richer Testcontainers-based roundtrip test was removed because the local
 * Colima socket isn't picked up by Spring Boot 3.4's {@code @ServiceConnection}
 * detection on this machine. Hibernate's {@code validate} mode will exercise
 * the full entity-↔-schema contract against a real Postgres in Step 5 when the
 * ingestion service runs.
 * <p>
 * For now this test only verifies entity classes instantiate and basic field
 * accessors are wired correctly via Lombok.
 */
class EntityRoundtripTest {

    @Test
    void entitiesInstantiateWithDefaults() {
        Source source = new Source();
        source.setName("Acme");
        source.setPlatform(Platform.GREENHOUSE);
        source.setBoardId("acme");
        assertThat(source.isActive()).isTrue();

        JobListing listing = new JobListing();
        listing.setSource(source);
        listing.setExternalId("ext-1");
        listing.setTitle("Senior Engineer");
        listing.setUrl("https://example.com/jobs/1");
        assertThat(listing.getStatus()).isEqualTo(ListingStatus.ACTIVE);
        assertThat(listing.getLocations()).isEmpty();

        LocationTag tag = new LocationTag();
        tag.setName("Toronto, ON");
        assertThat(tag.getGeoKey()).isNull();
        tag.setCountryCode("CA");
        assertThat(tag.getGeoKey()).isEqualTo("CA");
        tag.setRegionCode("CA-ON");
        assertThat(tag.getGeoKey()).isEqualTo("CA-ON");
        tag.setCity("Toronto");
        assertThat(tag.getGeoKey()).isEqualTo("CA-ON-Toronto");
        assertThat(tag.getGeocodingFailures()).isZero();

        Run run = new Run();
        assertThat(run.getStatus()).isEqualTo(RunStatus.PENDING);
        assertThat(run.getSourcesProcessed()).isZero();
    }
}
