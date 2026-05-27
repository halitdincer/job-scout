package com.jobscout.repository;

import com.jobscout.domain.LocationTag;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface LocationTagRepository
    extends JpaRepository<LocationTag, Long>, JpaSpecificationExecutor<LocationTag> {

    Optional<LocationTag> findByName(String name);

    List<LocationTag> findByNameIn(Collection<String> names);

    /**
     * Pending-geocode work queue for {@code LocationGeocoderJob}: tags whose
     * country has never been resolved, capped to a batch and ordered by id so
     * we cycle through them deterministically.
     */
    List<LocationTag> findTop50ByCountryCodeIsNullAndGeocodingFailuresLessThanOrderById(int maxFailures);
}
