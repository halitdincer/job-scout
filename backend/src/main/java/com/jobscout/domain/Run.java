package com.jobscout.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "core_run")
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(of = "id")
public class Run {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 10)
    private RunStatus status = RunStatus.PENDING;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    @Column(name = "sources_processed", nullable = false)
    private int sourcesProcessed = 0;

    @Column(name = "listings_created", nullable = false)
    private int listingsCreated = 0;

    @Column(name = "listings_updated", nullable = false)
    private int listingsUpdated = 0;

    @Column(name = "listings_expired", nullable = false)
    private int listingsExpired = 0;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
