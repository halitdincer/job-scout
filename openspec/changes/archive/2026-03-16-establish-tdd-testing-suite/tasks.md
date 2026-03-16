## 1. Dependencies and Configuration

- [x] 1.1 Create `requirements-dev.txt` with `-r requirements.txt`, `pytest`, `pytest-django`, `pytest-cov`
- [x] 1.2 Add `[tool.pytest.ini_options]` to `pyproject.toml` — set `DJANGO_SETTINGS_MODULE`, `pythonpath`, `testpaths`, and `addopts` with `--cov` and `--cov-fail-under=100`
- [x] 1.3 Add `[tool.coverage.run]` and `[tool.coverage.report]` sections to `pyproject.toml` — set `source`, `omit` patterns (migrations, manage.py, wsgi, asgi)

## 2. Test File Structure

- [x] 2.1 Remove empty `core/tests.py` and create `core/tests/` package with `__init__.py`
- [x] 2.2 Create `conftest.py` at project root with shared fixtures — replaced with `jobscout/settings_test.py` (cleaner approach)

## 3. Tests for Existing Code

- [x] 3.1 Create `core/tests/test_views.py` — test health endpoint returns 200 with `{"status": "ok"}`
- [x] 3.2 Create `core/tests/test_urls.py` — test `/api/health` resolves to `core.views.health`, `/admin/` resolves to admin
- [x] 3.3 Create `core/tests/test_apps.py` — test `CoreConfig.name == "core"`
- [x] 3.4 Create `core/tests/test_settings.py` — test default settings values (`DEBUG`, `ALLOWED_HOSTS`, `INSTALLED_APPS` includes `core`)

## 4. Verify Coverage

- [x] 4.1 Run `pytest` and confirm all tests pass with 100% coverage on covered source files
- [x] 4.2 Adjust `[tool.coverage]` omit patterns if needed to exclude boilerplate (wsgi.py, asgi.py, manage.py, migrations)

## 5. CI Integration

- [x] 5.1 Add a `test` job to `.github/workflows/ci.yml` that installs dev dependencies and runs `pytest` before the Docker build
- [x] 5.2 Verify CI pipeline runs tests and fails on coverage drop

## 6. TDD Mandate

- [x] 6.1 Add TDD workflow section to project-level `CLAUDE.md` (at `openspec/CLAUDE.md` or project root) mandating red-green-refactor, no untested code, coverage enforcement
