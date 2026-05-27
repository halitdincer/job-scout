package com.jobscout.repository;

import com.jobscout.domain.JobListing;
import com.jobscout.domain.SeenListing;
import com.jobscout.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SeenListingRepository extends JpaRepository<SeenListing, Long> {
    boolean existsByUserAndListing(User user, JobListing listing);
}
