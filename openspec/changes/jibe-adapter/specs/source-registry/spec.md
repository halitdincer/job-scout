## MODIFIED Requirements

### Requirement: Source model
The system SHALL have a `Source` model with fields: `name` (human-readable company name), `platform` (choice of `greenhouse`, `lever`, `ashby`, `workday`, `bamboohr`, `phenom`, `jibe`), `board_id` (the platform-specific identifier/slug), `is_active` (boolean, default true), and timestamps (`created_at`, `updated_at`).

#### Scenario: Create a Jibe source
- **WHEN** a Source is created with `name="AON"`, `platform="jibe"`, `board_id="jobs.aon.com"`
- **THEN** the source is persisted with `is_active=True` and valid timestamps

#### Scenario: Platform choices are restricted
- **WHEN** a Source is created with a platform value not in the allowed set (e.g. `platform="taleo"`)
- **THEN** a validation error is raised because the value is not in the allowed choices
