## ADDED Requirements

### Requirement: Source model admin registration
The Django admin site SHALL display Source records with columns for name, platform, board_id, and is_active. It SHALL support searching by name and board_id, and filtering by platform and is_active.

#### Scenario: Admin lists sources
- **WHEN** an admin user visits the Source list in Django admin
- **THEN** the list displays columns: name, platform, board_id, is_active

#### Scenario: Admin searches sources
- **WHEN** an admin user searches for "stripe" in the Source admin
- **THEN** the results include sources whose name or board_id contain "stripe"

#### Scenario: Admin filters sources by platform
- **WHEN** an admin user selects "greenhouse" from the platform filter
- **THEN** only Greenhouse sources are displayed

### Requirement: JobListing model admin registration
The Django admin site SHALL display JobListing records with columns for title, source, department, location, status, and first_seen_at. It SHALL support searching by title and department, and filtering by status and source.

#### Scenario: Admin lists job listings
- **WHEN** an admin user visits the JobListing list in Django admin
- **THEN** the list displays columns: title, source, department, location, status, first_seen_at

#### Scenario: Admin searches job listings
- **WHEN** an admin user searches for "engineer" in the JobListing admin
- **THEN** the results include listings whose title or department contain "engineer"

### Requirement: Run model admin registration
The Django admin site SHALL display Run records with columns for id, status, started_at, finished_at, sources_processed, listings_created, and listings_expired. It SHALL support filtering by status.

#### Scenario: Admin lists runs
- **WHEN** an admin user visits the Run list in Django admin
- **THEN** the list displays columns: id, status, started_at, finished_at, sources_processed, listings_created, listings_expired

#### Scenario: Admin filters runs by status
- **WHEN** an admin user selects "failed" from the status filter
- **THEN** only failed runs are displayed
