## Why

The project has zero tests despite having a working Django app with a health endpoint, database configuration, and environment variable handling. Establishing a test suite now — before feature development accelerates — ensures every future change is developed test-first (TDD). This creates a safety net that prevents regressions and enforces discipline for all contributors (human or AI).

## What Changes

- Add `pytest` and `pytest-django` as the test runner (industry standard, better than Django's default test runner)
- Add `pytest-cov` for coverage measurement with 100% target
- Create test configuration (`pytest.ini` / `conftest.py`)
- Write tests for all existing functionality: health endpoint, URL routing, settings, app configuration
- Add a `CLAUDE.md` section mandating TDD workflow for all future development
- Add a pre-commit hook or CI gate that enforces coverage thresholds

## Capabilities

### New Capabilities
- `test-infrastructure`: pytest + pytest-django setup, configuration, conftest fixtures, coverage settings, and CI coverage gate
- `tdd-workflow`: TDD mandate documented in CLAUDE.md — red-green-refactor workflow, no untested code, coverage enforcement rules

### Modified Capabilities
- `django-project`: Adding test coverage for all existing requirements (health endpoint, database config, settings, static files)

## Impact

- **New files**: `pytest.ini` (or `pyproject.toml` test section), `conftest.py`, `core/tests/` test modules
- **Dependencies**: `pytest`, `pytest-django`, `pytest-cov` added to `requirements.txt` (or `requirements-dev.txt`)
- **CI**: Coverage check added to GitHub Actions workflow
- **CLAUDE.md**: TDD mandate section added for all future AI-assisted development
