## ADDED Requirements

### Requirement: Jibe adapter
The Jibe adapter SHALL fetch listings from `GET https://{board_id}/api/jobs?from=N&size=10`, where `board_id` is the careers hostname. It SHALL start at `from=0`, increment by the returned job count until the response's `jobs` array is empty or `totalCount` is reached, and SHALL return `is_listed: None`. The job URL SHALL prefer `meta_data.canonical_url` from the response, falling back to `f"https://{board_id}/jobs/{req_id}?lang={language}"`.

#### Scenario: Jibe returns is_listed as None
- **WHEN** the Jibe adapter fetches listings
- **THEN** each listing has `is_listed: None`

#### Scenario: Jibe paginates by offset
- **WHEN** `from=0` returns a non-empty `jobs` array
- **THEN** the adapter increments `from` by the returned job count, continuing until a page returns an empty `jobs` array or `totalCount` is reached

#### Scenario: Jibe normalizes uppercase employment types
- **WHEN** a posting has `employment_type="FULL_TIME"`
- **THEN** the listing's `employment_type` is `"full_time"` (matched after underscore-to-space substitution)

#### Scenario: Jibe splits multi-location full_location
- **WHEN** a posting has `multipleLocations=True` and `full_location="New York, New York; Chicago, Illinois"`
- **THEN** the listing's `locations` is `["New York, New York", "Chicago, Illinois"]`
