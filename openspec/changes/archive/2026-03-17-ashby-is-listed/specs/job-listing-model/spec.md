## MODIFIED Requirements

### Requirement: JobListing model
The system SHALL have a `JobListing` model with fields: `source` (foreign key to Source), `external_id` (string), `title` (string), `department` (string, nullable), `locations` (M2M to LocationTag), `url` (URL string), `status` (choice of `active`, `expired`, default `active`), `team` (string, nullable), `employment_type` (choice, nullable), `workplace_type` (choice, nullable), `country` (string, nullable), `expired_at` (datetime, nullable), `published_at` (datetime, nullable), `updated_at_source` (datetime, nullable), and timestamps (`first_seen_at`, `last_seen_at`). The `expired_at` field records when the listing was marked expired.

#### Scenario: Create a job listing with enriched fields
- **WHEN** a JobListing is created with team, employment_type, workplace_type, country, and published_at
- **THEN** all fields are persisted correctly

#### Scenario: expired_at defaults to None
- **WHEN** a JobListing is created without specifying expired_at
- **THEN** expired_at is None

#### Scenario: expired_at set on expiration
- **WHEN** a listing transitions from active to expired
- **THEN** expired_at is set to the current timestamp

### Requirement: List job listings API
The system SHALL expose `GET /api/jobs/` that returns all job listings as a JSON array including `expired_at` field.

#### Scenario: List all jobs
- **WHEN** a GET request is made to `/api/jobs/`
- **THEN** the response includes `expired_at` for each listing
