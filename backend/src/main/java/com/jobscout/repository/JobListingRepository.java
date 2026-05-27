package com.jobscout.repository;

import com.jobscout.domain.JobListing;
import com.jobscout.domain.Source;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface JobListingRepository
    extends JpaRepository<JobListing, Long>, JpaSpecificationExecutor<JobListing> {

    Optional<JobListing> findBySourceAndExternalId(Source source, String externalId);

    List<JobListing> findBySourceAndExternalIdIn(Source source, List<String> externalIds);
}
