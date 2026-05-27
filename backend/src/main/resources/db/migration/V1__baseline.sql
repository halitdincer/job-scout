-- Baseline schema for job-scout. Single migration, no history from Django.
-- Trimmed: drops department, team, employment_type, workplace_type from job_listing.
-- New: geocoded_at and geocoding_failures on location_tag for the decoupled geocoder.

-- ---------------------------------------------------------------------------
-- Authentication (compatible with Django's auth_user so we can carry passwords)
-- ---------------------------------------------------------------------------
CREATE TABLE auth_user (
    id              SERIAL PRIMARY KEY,
    password        VARCHAR(128)   NOT NULL,
    last_login      TIMESTAMPTZ    NULL,
    is_superuser    BOOLEAN        NOT NULL DEFAULT FALSE,
    username        VARCHAR(150)   NOT NULL UNIQUE,
    first_name      VARCHAR(150)   NOT NULL DEFAULT '',
    last_name       VARCHAR(150)   NOT NULL DEFAULT '',
    email           VARCHAR(254)   NOT NULL DEFAULT '',
    is_staff        BOOLEAN        NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN        NOT NULL DEFAULT TRUE,
    date_joined     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Job source configurations (per-tenant ATS boards)
-- ---------------------------------------------------------------------------
CREATE TABLE core_source (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    platform    VARCHAR(20)  NOT NULL,
    board_id    VARCHAR(255) NOT NULL,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_platform_board UNIQUE (platform, board_id)
);

-- ---------------------------------------------------------------------------
-- Geocoded location tags (M2M target from JobListing)
-- ---------------------------------------------------------------------------
CREATE TABLE core_locationtag (
    id                  BIGSERIAL PRIMARY KEY,
    name                VARCHAR(255) NOT NULL UNIQUE,
    country_code        VARCHAR(2)   NULL,
    region_code         VARCHAR(10)  NULL,
    city                VARCHAR(255) NULL,
    geocoded_at         TIMESTAMPTZ  NULL,
    geocoding_failures  INT          NOT NULL DEFAULT 0
);

CREATE INDEX idx_location_pending_geocode
    ON core_locationtag (geocoding_failures)
    WHERE country_code IS NULL;

-- ---------------------------------------------------------------------------
-- Job listings (trimmed)
-- ---------------------------------------------------------------------------
CREATE TABLE core_joblisting (
    id                  BIGSERIAL PRIMARY KEY,
    source_id           BIGINT       NOT NULL REFERENCES core_source(id) ON DELETE CASCADE,
    external_id         VARCHAR(255) NOT NULL,
    title               VARCHAR(500) NOT NULL,
    url                 VARCHAR(1000) NOT NULL,
    status              VARCHAR(10)  NOT NULL DEFAULT 'active',
    expired_at          TIMESTAMPTZ  NULL,
    published_at        TIMESTAMPTZ  NULL,
    updated_at_source   TIMESTAMPTZ  NULL,
    first_seen_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_seen_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_source_external_id UNIQUE (source_id, external_id)
);

CREATE INDEX idx_listing_status      ON core_joblisting(status);
CREATE INDEX idx_listing_first_seen  ON core_joblisting(first_seen_at DESC);
CREATE INDEX idx_listing_source      ON core_joblisting(source_id);

-- M2M join table
CREATE TABLE core_joblisting_locations (
    joblisting_id   BIGINT NOT NULL REFERENCES core_joblisting(id)  ON DELETE CASCADE,
    locationtag_id  BIGINT NOT NULL REFERENCES core_locationtag(id) ON DELETE CASCADE,
    PRIMARY KEY (joblisting_id, locationtag_id)
);

CREATE INDEX idx_jl_locations_tag ON core_joblisting_locations(locationtag_id);

-- ---------------------------------------------------------------------------
-- Ingestion runs
-- ---------------------------------------------------------------------------
CREATE TABLE core_run (
    id                  BIGSERIAL PRIMARY KEY,
    status              VARCHAR(10) NOT NULL DEFAULT 'pending',
    started_at          TIMESTAMPTZ NULL,
    finished_at         TIMESTAMPTZ NULL,
    sources_processed   INT         NOT NULL DEFAULT 0,
    listings_created    INT         NOT NULL DEFAULT 0,
    listings_updated    INT         NOT NULL DEFAULT 0,
    listings_expired    INT         NOT NULL DEFAULT 0,
    error_message       TEXT        NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Per-user "seen" tracking
-- ---------------------------------------------------------------------------
CREATE TABLE core_seenlisting (
    id          BIGSERIAL PRIMARY KEY,
    user_id     INTEGER     NOT NULL REFERENCES auth_user(id)   ON DELETE CASCADE,
    listing_id  BIGINT      NOT NULL REFERENCES core_joblisting(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_listing_seen UNIQUE (user_id, listing_id)
);

CREATE INDEX seen_user_listing_idx ON core_seenlisting(user_id, listing_id);

-- ---------------------------------------------------------------------------
-- Per-user saved filter + sort + column configurations
-- ---------------------------------------------------------------------------
CREATE TABLE core_savedview (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             INTEGER      NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
    name                VARCHAR(255) NOT NULL,
    filter_expression   JSONB        NULL,
    columns             JSONB        NOT NULL,
    sort                JSONB        NOT NULL,
    config              JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_view_name UNIQUE (user_id, name)
);
