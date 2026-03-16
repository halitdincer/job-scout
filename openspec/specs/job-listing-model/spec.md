## ADDED Requirements

### Requirement: JobListing model
The system SHALL have a `JobListing` model with fields: `source` (foreign key to Source), `external_id` (string, the platform's job ID), `title` (string), `department` (string, nullable), `location` (string, nullable), `url` (URL string), `status` (choice of `active`, `expired`, default `active`), and timestamps (`first_seen_at`, `last_seen_at`).

#### Scenario: Create a job listing
- **WHEN** a JobListing is created with a valid source, external_id, title, and url
- **THEN** the listing is persisted with `status="active"` and `first_seen_at` set to now

### Requirement: JobListing uniqueness
The system SHALL enforce a unique constraint on `(source, external_id)` to prevent duplicate listings from the same source.

#### Scenario: Duplicate listing rejected
- **WHEN** a JobListing with the same source and external_id already exists
- **THEN** an integrity error is raised

### Requirement: List job listings API
The system SHALL expose `GET /api/jobs/` that returns all job listings as a JSON array with fields: `id`, `source_id`, `source_name`, `external_id`, `title`, `department`, `location`, `url`, `status`, `first_seen_at`, `last_seen_at`.

#### Scenario: List all jobs
- **WHEN** a GET request is made to `/api/jobs/`
- **THEN** the response is HTTP 200 with a JSON array of all job listings

#### Scenario: Filter jobs by source
- **WHEN** a GET request is made to `/api/jobs/?source_id=1`
- **THEN** the response contains only listings belonging to source with id 1

#### Scenario: Filter jobs by status
- **WHEN** a GET request is made to `/api/jobs/?status=active`
- **THEN** the response contains only listings with status `active`

### Requirement: JobListing string representation
The system SHALL represent a JobListing as `"{title} at {source.name}"` when converted to string.

#### Scenario: JobListing str
- **WHEN** `str()` is called on a JobListing with `title="Software Engineer"` and source name `"Airbnb"`
- **THEN** the result is `"Software Engineer at Airbnb"`
