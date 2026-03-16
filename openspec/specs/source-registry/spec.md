## ADDED Requirements

### Requirement: Source model
The system SHALL have a `Source` model with fields: `name` (human-readable company name), `platform` (choice of `greenhouse`, `lever`, `ashby`), `board_id` (the platform-specific identifier/slug), `is_active` (boolean, default true), and timestamps (`created_at`, `updated_at`).

#### Scenario: Create a Greenhouse source
- **WHEN** a Source is created with `name="Airbnb"`, `platform="greenhouse"`, `board_id="airbnb"`
- **THEN** the source is persisted with `is_active=True` and valid timestamps

#### Scenario: Platform choices are restricted
- **WHEN** a Source is created with `platform="workday"`
- **THEN** a validation error is raised because `workday` is not in the allowed choices

### Requirement: Source uniqueness
The system SHALL enforce a unique constraint on `(platform, board_id)` to prevent duplicate sources for the same company board.

#### Scenario: Duplicate source rejected
- **WHEN** a Source with `platform="greenhouse"`, `board_id="airbnb"` already exists and another is created with the same values
- **THEN** an integrity error is raised

### Requirement: List sources API
The system SHALL expose `GET /api/sources/` that returns all sources as a JSON array with fields: `id`, `name`, `platform`, `board_id`, `is_active`.

#### Scenario: List all sources
- **WHEN** a GET request is made to `/api/sources/`
- **THEN** the response is HTTP 200 with a JSON array of all sources

### Requirement: Source string representation
The system SHALL represent a Source as `"{name} ({platform})"` when converted to string.

#### Scenario: Source str
- **WHEN** `str()` is called on a Source with `name="Airbnb"` and `platform="greenhouse"`
- **THEN** the result is `"Airbnb (greenhouse)"`
