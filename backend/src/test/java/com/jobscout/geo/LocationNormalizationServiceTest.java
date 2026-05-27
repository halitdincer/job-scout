package com.jobscout.geo;

import static org.assertj.core.api.Assertions.assertThat;

import com.jobscout.domain.Platform;
import java.util.List;
import org.junit.jupiter.api.Test;

class LocationNormalizationServiceTest {

    private final LocationNormalizationService svc = new LocationNormalizationService();

    @Test
    void simpleLocationPassesThrough() {
        assertThat(svc.normalizeValue("Toronto, ON", "default"))
            .containsExactly("Toronto, ON");
    }

    @Test
    void compositeSplitsOnPipe() {
        assertThat(svc.normalizeValue("Toronto, ON | New York, NY", "default"))
            .containsExactly("Toronto, ON", "New York, NY");
    }

    @Test
    void compositeSplitsOnSemicolon() {
        assertThat(svc.normalizeValue("Toronto, ON; New York, NY", "default"))
            .containsExactly("Toronto, ON", "New York, NY");
    }

    @Test
    void compositeSplitsOnSlashWithSpaces() {
        assertThat(svc.normalizeValue("Remote / On-site", "default"))
            .containsExactly("Remote", "On-site");
    }

    @Test
    void compositeSplitsOnWordOrCaseInsensitive() {
        assertThat(svc.normalizeValue("Toronto OR New York", "default"))
            .containsExactly("Toronto", "New York");
    }

    @Test
    void compositeSplitsOnBullet() {
        assertThat(svc.normalizeValue("Toronto • New York", "default"))
            .containsExactly("Toronto", "New York");
    }

    @Test
    void emptyAndNullReturnEmpty() {
        assertThat(svc.normalizeValue(null, "default")).isEmpty();
        assertThat(svc.normalizeValue("", "default")).isEmpty();
        assertThat(svc.normalizeValue("   ", "default")).isEmpty();
    }

    @Test
    void stripeProfileKeepsCanonicalCityStateCountry() {
        assertThat(svc.normalizeValue("San Francisco, CA", "stripe"))
            .containsExactly("San Francisco, CA");
        assertThat(svc.normalizeValue("San Francisco, CA, US", "stripe"))
            .containsExactly("San Francisco, CA, US");
    }

    @Test
    void stripeProfileKeepsRemoteVariantsIntact() {
        assertThat(svc.normalizeValue("Remote", "stripe"))
            .containsExactly("Remote");
        assertThat(svc.normalizeValue("US-Remote", "stripe"))
            .containsExactly("US-Remote");
        assertThat(svc.normalizeValue("Remote in Canada", "stripe"))
            .containsExactly("Remote in Canada");
    }

    @Test
    void stripeProfileFallsThroughToCommaSplit() {
        assertThat(svc.normalizeValue("Engineering, Customer Success", "stripe"))
            .containsExactly("Engineering", "Customer Success");
    }

    @Test
    void dictLiteralExtractsLocationField() {
        assertThat(svc.normalizeValue("{'location': 'Toronto, ON'}", "default"))
            .containsExactly("Toronto, ON");
        assertThat(svc.normalizeValue("{\"location\": \"Toronto, ON\"}", "default"))
            .containsExactly("Toronto, ON");
    }

    @Test
    void normalizeValuesDedupesAcrossRawList() {
        List<String> out = svc.normalizeValues(
            List.of("Toronto, ON | New York", "New York", "Remote"),
            "default"
        );
        assertThat(out).containsExactly("Toronto, ON", "New York", "Remote");
    }

    @Test
    void parsingProfileResolvesStripeOnly() {
        assertThat(svc.parsingProfile(Platform.GREENHOUSE, "stripe")).isEqualTo("stripe");
        assertThat(svc.parsingProfile(Platform.GREENHOUSE, "anthropic")).isEqualTo("default");
        assertThat(svc.parsingProfile(Platform.LEVER, "stripe")).isEqualTo("default");
    }
}
