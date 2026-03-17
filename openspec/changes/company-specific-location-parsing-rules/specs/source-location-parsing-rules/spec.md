## ADDED Requirements

### Requirement: Source-specific parsing profile registry
The system SHALL support source-specific location parsing profiles that extend default normalization behavior. Profile selection SHALL be deterministic based on source identity and SHALL fall back to a default profile when no source-specific profile is configured.

#### Scenario: Default profile used for unspecified source
- **WHEN** ingestion or remediation processes a source with no custom profile
- **THEN** normalization uses the default delimiter rules only

#### Scenario: Stripe profile selected for Stripe source
- **WHEN** ingestion or remediation processes a Stripe source
- **THEN** normalization uses the Stripe-specific parsing profile

### Requirement: Stripe comma parsing rule
The Stripe parsing profile SHALL support comma-delimited multi-location splitting for Stripe-specific multi-location patterns while preserving valid single-location comma formats.

#### Scenario: Split Stripe multi-location comma value
- **WHEN** Stripe provides `"SF, NYC, CHI, SEA"`
- **THEN** normalization returns four location tokens

#### Scenario: Preserve single Stripe location with city-state-country form
- **WHEN** Stripe provides `"San Francisco, CA, US"`
- **THEN** normalization returns one location token

### Requirement: Source-aware remediation parsing
The `normalize_location_tags` command SHALL apply source-aware parsing profiles during relinking so historical tags are split according to the same profile rules used during ingestion.

#### Scenario: Remediation applies Stripe profile
- **WHEN** remediation processes a Stripe listing linked to a comma-delimited multi-location tag
- **THEN** it relinks the listing to parsed per-location tags produced by the Stripe profile
