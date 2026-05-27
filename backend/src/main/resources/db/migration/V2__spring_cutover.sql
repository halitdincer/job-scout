-- Existing production databases were created by Django and have no Flyway
-- history table. With baseline-on-migrate enabled, Flyway marks V1 as already
-- present and applies this cutover migration.

ALTER TABLE core_locationtag
    ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ NULL;

ALTER TABLE core_locationtag
    ADD COLUMN IF NOT EXISTS geocoding_failures INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_location_pending_geocode
    ON core_locationtag (geocoding_failures)
    WHERE country_code IS NULL;

CREATE INDEX IF NOT EXISTS idx_listing_status
    ON core_joblisting(status);

CREATE INDEX IF NOT EXISTS idx_listing_first_seen
    ON core_joblisting(first_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_source
    ON core_joblisting(source_id);
