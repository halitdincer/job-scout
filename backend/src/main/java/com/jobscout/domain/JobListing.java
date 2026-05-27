package com.jobscout.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(
    name = "core_joblisting",
    uniqueConstraints = @UniqueConstraint(
        name = "unique_source_external_id",
        columnNames = {"source_id", "external_id"}
    ),
    indexes = {
        @Index(name = "idx_listing_status", columnList = "status"),
        @Index(name = "idx_listing_first_seen", columnList = "first_seen_at DESC")
    }
)
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(of = "id")
public class JobListing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "source_id", nullable = false)
    private Source source;

    @Column(name = "external_id", nullable = false)
    private String externalId;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(nullable = false, length = 1000)
    private String url;

    @Column(nullable = false, length = 10)
    private ListingStatus status = ListingStatus.ACTIVE;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "core_joblisting_locations",
        joinColumns = @JoinColumn(name = "joblisting_id"),
        inverseJoinColumns = @JoinColumn(name = "locationtag_id")
    )
    private Set<LocationTag> locations = new HashSet<>();

    @Column(name = "expired_at")
    private Instant expiredAt;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "updated_at_source")
    private Instant updatedAtSource;

    @CreationTimestamp
    @Column(name = "first_seen_at", nullable = false, updatable = false)
    private Instant firstSeenAt;

    @UpdateTimestamp
    @Column(name = "last_seen_at", nullable = false)
    private Instant lastSeenAt;
}
