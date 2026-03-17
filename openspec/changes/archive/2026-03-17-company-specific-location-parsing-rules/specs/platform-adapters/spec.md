## MODIFIED Requirements

### Requirement: Adapter interface
Each platform adapter SHALL return `is_listed` (bool or None) in its normalized dict. This field is used as an ingestion signal — `False` means the listing should be marked expired. `None` means the platform does not provide this information. Adapters SHALL continue returning source-provided location strings in `locations`, and source-specific splitting/normalization SHALL be performed by the location normalization layer.

#### Scenario: Adapter returns is_listed field
- **WHEN** an adapter fetches listings
- **THEN** each item includes `is_listed` (bool or None)

#### Scenario: Adapter provides source location strings
- **WHEN** an adapter fetches listings with one or more location values
- **THEN** `locations` contains source-provided string values and does not apply source-specific splitting logic inside the adapter
