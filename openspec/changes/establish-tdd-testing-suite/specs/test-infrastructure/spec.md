## ADDED Requirements

### Requirement: pytest test runner configuration
The system SHALL use pytest with pytest-django as the test framework, configured via `pyproject.toml` with `DJANGO_SETTINGS_MODULE=jobscout.settings`.

#### Scenario: Tests run via pytest command
- **WHEN** the developer runs `pytest` from the project root
- **THEN** pytest discovers and runs all tests in `core/tests/` and reports results

#### Scenario: Django test database is created automatically
- **WHEN** pytest runs tests that require database access
- **THEN** pytest-django creates an in-memory SQLite test database automatically

### Requirement: Coverage measurement and enforcement
The system SHALL measure test coverage using `pytest-cov` and enforce 100% line coverage via `--cov-fail-under=100` in pytest configuration.

#### Scenario: Coverage report generated on test run
- **WHEN** the developer runs `pytest`
- **THEN** a coverage report is printed showing per-file line coverage percentages

#### Scenario: Test run fails if coverage drops below 100%
- **WHEN** pytest runs and any source file has less than 100% line coverage
- **THEN** the test run exits with a non-zero status code

### Requirement: Dev dependencies separated from production
The system SHALL have a `requirements-dev.txt` that includes production dependencies (`-r requirements.txt`) plus `pytest`, `pytest-django`, and `pytest-cov`. Production `requirements.txt` SHALL NOT include test dependencies.

#### Scenario: Developer installs dev dependencies
- **WHEN** the developer runs `pip install -r requirements-dev.txt`
- **THEN** all production and test dependencies are installed

#### Scenario: Production image excludes test dependencies
- **WHEN** the Docker image is built using `requirements.txt`
- **THEN** pytest, pytest-django, and pytest-cov are NOT installed in the image

### Requirement: CI coverage gate
The system SHALL run `pytest` with coverage enforcement in the GitHub Actions CI pipeline before the Docker build step. The pipeline SHALL fail if coverage is below the threshold.

#### Scenario: CI fails on insufficient coverage
- **WHEN** a push to main has code not covered by tests
- **THEN** the CI pipeline fails before building the Docker image

#### Scenario: CI passes with full coverage
- **WHEN** all source code has 100% test coverage
- **THEN** the CI pipeline proceeds to the Docker build step
