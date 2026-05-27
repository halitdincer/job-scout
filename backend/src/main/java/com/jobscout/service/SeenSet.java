package com.jobscout.service;

import com.jobscout.domain.User;
import jakarta.persistence.EntityManager;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;

/** Loads the set of listing IDs the given user has marked as seen, for a page. */
@Service
public class SeenSet {

    private final EntityManager em;

    public SeenSet(EntityManager em) {
        this.em = em;
    }

    public Set<Long> forUserAndListings(User user, List<Long> listingIds) {
        if (listingIds.isEmpty()) return Set.of();
        List<Long> ids = em.createQuery(
            "SELECT s.listing.id FROM SeenListing s "
                + "WHERE s.user = :u AND s.listing.id IN :ids", Long.class)
            .setParameter("u", user)
            .setParameter("ids", listingIds)
            .getResultList();
        return new HashSet<>(ids);
    }
}
