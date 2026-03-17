## Why

Upstream job boards send inconsistent location formats, and some companies publish multi-location blobs in a single field (especially comma-delimited forms), while others use commas for valid single locations like `City, ST, CC`. A global comma split causes false positives, so we need source-specific parsing rules to improve normalization accuracy without breaking clean sources.

## What Changes

- Add a source-aware location parsing rule system that can apply custom splitting behavior per company/source.
- Introduce a Stripe-specific comma parsing rule to split known multi-location comma patterns while preserving valid single-location formats.
- Keep existing global safe delimiters (`;`, ` / `, `or`) as defaults for all sources.
- Apply source-specific parsing in both ingestion-time normalization and remediation command flow so M2M linking is rebuilt consistently.
- Add tests that prove source-specific comma parsing improves Stripe while avoiding regressions for Pinterest-style `City, ST, CC` values.

## Capabilities

### New Capabilities
- `source-location-parsing-rules`: Configurable source-specific parsing behavior for location tokenization and normalization.

### Modified Capabilities
- `location-tags`: Location tokenization and tag association requirements now depend on source-aware parsing rules.
- `platform-adapters`: Adapter output contract is clarified alongside source-aware normalization expectations.
- `location-geo-normalization`: Geo enrichment/remediation behavior is updated to run after source-aware tokenization.

## Impact

- `core/location_normalization.py` (rule registry + parser behavior)
- `core/ingestion.py` (pass source context into normalization)
- `core/management/commands/normalize_location_tags.py` (source-aware remediation relinking)
- Tests for ingestion, normalization, and commands
- OpenSpec delta specs for the affected capabilities
