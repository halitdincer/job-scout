package com.jobscout.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.Instant;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "core_locationtag")
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(of = "id")
public class LocationTag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(name = "country_code", length = 2)
    private String countryCode;

    @Column(name = "region_code", length = 10)
    private String regionCode;

    private String city;

    /**
     * When the geocoder last successfully populated country/region/city.
     * Null = never geocoded; the LocationGeocoderJob will pick it up.
     */
    @Column(name = "geocoded_at")
    private Instant geocodedAt;

    /**
     * Consecutive geocoding failures. The job stops retrying after 3 to avoid
     * hammering Nominatim for unparseable strings.
     */
    @Column(name = "geocoding_failures", nullable = false)
    private int geocodingFailures = 0;

    @Transient
    public String getGeoKey() {
        if (countryCode == null) return null;
        if (regionCode == null) return countryCode;
        if (city == null) return regionCode;
        return regionCode + "-" + city;
    }
}
