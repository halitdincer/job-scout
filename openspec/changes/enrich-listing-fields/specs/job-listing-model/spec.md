## MODIFIED Requirements

### Requirement: JobListing model
The system SHALL have a `JobListing` model with fields: `source` (foreign key to Source), `external_id` (string, the platform's job ID), `title` (string), `department` (string, nullable), `locations` (M2M to LocationTag), `url` (URL string), `status` (choice of `active`, `expired`, default `active`), `team` (string, nullable), `employment_type` (choice of `full_time`, `part_time`, `contract`, `intern`, `temporary`, `unknown`, nullable), `workplace_type` (choice of `on_site`, `remote`, `hybrid`, `unknown`, nullable), `country` (string, nullable), `published_at` (datetime, nullable), `updated_at_source` (datetime, nullable), and timestamps (`first_seen_at`, `last_seen_at`). The previous `location` CharField is removed in favor of the `locations` M2M relationship.

#### Scenario: Create a job listing with enriched fields
- **WHEN** a JobListing is created with team, employment_type, workplace_type, country, and published_at
- **THEN** all fields are persisted correctly

#### Scenario: Create a job listing with null enriched fields
- **WHEN** a JobListing is created without team, employment_type, workplace_type, country, published_at, or updated_at_source
- **THEN** the listing is persisted with those fields set to null

#### Scenario: Employment type validates choices
- **WHEN** a JobListing is created with `employment_type="full_time"`
- **THEN** the value is accepted

### Requirement: List job listings API
The system SHALL expose `GET /api/jobs/` that returns all job listings as a JSON array with fields: `id`, `source_id`, `source_name`, `external_id`, `title`, `department`, `location`, `url`, `status`, `team`, `employment_type`, `workplace_type`, `country`, `published_at`, `updated_at_source`, `first_seen_at`, `last_seen_at`.

#### Scenario: List all jobs
- **WHEN** a GET request is made to `/api/jobs/`
- **THEN** the response is HTTP 200 with a JSON array of all job listings including enriched fields

#### Scenario: Filter jobs by source
- **WHEN** a GET request is made to `/api/jobs/?source_id=1`
- **THEN** the response contains only listings belonging to source with id 1

#### Scenario: Filter jobs by status
- **WHEN** a GET request is made to `/api/jobs/?status=active`
- **THEN** the response contains only listings with status `active`
