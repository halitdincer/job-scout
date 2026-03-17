## MODIFIED Requirements

### Requirement: Adapter interface
Each platform adapter SHALL return `is_listed` (bool or None) in its normalized dict. This field is used as an ingestion signal — `False` means the listing should be marked expired. `None` means the platform does not provide this information.

#### Scenario: Adapter returns is_listed field
- **WHEN** an adapter fetches listings
- **THEN** each item includes `is_listed` (bool or None)

### Requirement: Greenhouse adapter
The Greenhouse adapter SHALL return `is_listed: None`.

#### Scenario: Greenhouse returns is_listed as None
- **WHEN** the Greenhouse adapter fetches listings
- **THEN** each listing has `is_listed: None`

### Requirement: Lever adapter
The Lever adapter SHALL return `is_listed: None`.

#### Scenario: Lever returns is_listed as None
- **WHEN** the Lever adapter fetches listings
- **THEN** each listing has `is_listed: None`

### Requirement: Ashby adapter
The Ashby adapter SHALL return `is_listed` from the `isListed` boolean field in the API response.

#### Scenario: Ashby returns is_listed from API
- **WHEN** an Ashby job has `isListed=true`
- **THEN** the normalized `is_listed` is `True`

#### Scenario: Ashby unlisted job
- **WHEN** an Ashby job has `isListed=false`
- **THEN** the normalized `is_listed` is `False`
