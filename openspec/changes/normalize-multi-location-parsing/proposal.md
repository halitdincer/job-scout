## Why

The current ingestion pipeline stores some multi-location strings as a single `LocationTag` and also stores serialized Ashby location objects as raw text tags. This pollutes location data, weakens region/city filtering, and prevents accurate geo normalization, so we need to normalize adapter outputs and clean existing malformed tags now.

## What Changes

- Normalize adapter location extraction so ingestion always receives a list of plain location names (no dict-stringified values).
- Add ingestion-side location tokenization for known composite formats (for example separators like `;`, ` / `, and ` or `) before creating `LocationTag` records.
- Add a remediation command to split and migrate existing malformed/composite `LocationTag` entries to normalized tags and re-link affected `JobListing` records.
- Ensure geo parsing behavior runs on normalized tags so region/city outputs reflect true locations.

## Capabilities

### New Capabilities
- `location-tag-remediation`: Management-command workflow for correcting existing malformed/composite location tags and re-linking listings safely.

### Modified Capabilities
- `platform-adapters`: Adapter normalization rules for location extraction are expanded to guarantee clean string location arrays.
- `location-tags`: Ingestion behavior for creating location tags is tightened so one tag represents one logical location.
- `location-geo-normalization`: Geo enrichment behavior is clarified to operate on normalized single-location tags, including tags produced after remediation.

## Impact

- `core/adapters.py` and adapter tests for normalized location output.
- `core/ingestion.py` and ingestion tests for composite-location splitting rules.
- New remediation command and tests in `core/management/commands/`.
- Existing production data in `LocationTag` and `JobListing.locations` relationships (data migration/remediation path).
- No API contract additions expected, but `/api/jobs/` region/city values become more accurate after remediation.
