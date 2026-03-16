## Context

The job-scout project is a freshly scaffolded Django app with a single health endpoint (`GET /api/health`), PostgreSQL via `dj-database-url`, environment-based settings, and WhiteNoise static files. There are zero tests. The project is deployed via Docker to K3s with a GitHub Actions CI pipeline that currently only builds and pushes the image.

## Goals / Non-Goals

**Goals:**
- Establish pytest + pytest-django as the test framework
- Achieve 100% test coverage on all existing source code
- Add coverage enforcement in CI so merges cannot reduce coverage
- Document a TDD mandate in project configuration so all future development (human or AI) follows red-green-refactor

**Non-Goals:**
- Adding new features or models (this change is purely about test infrastructure)
- Integration testing against a live PostgreSQL (tests use Django's default SQLite test DB)
- Browser/E2E testing (no frontend exists yet)
- Load or performance testing

## Decisions

### 1. pytest + pytest-django over Django's built-in test runner

**Choice**: pytest with pytest-django plugin

**Rationale**: pytest has better assertion introspection, fixture system, parametrize support, and plugin ecosystem. pytest-django provides Django-specific fixtures (`client`, `db`, `settings`) and auto-discovers tests. Industry standard for Django projects.

**Alternative considered**: Django's `manage.py test` — functional but lacks pytest's ergonomics and plugin ecosystem.

### 2. Test file organization: `tests/` package per app

**Choice**: Replace `core/tests.py` with `core/tests/` package containing module-per-concern files (`test_views.py`, `test_urls.py`, etc.)

**Rationale**: Scales better as the app grows. Each test module maps to a source module, making it obvious what's tested and what's not.

### 3. Dev dependencies in `requirements-dev.txt`

**Choice**: Create `requirements-dev.txt` that includes `-r requirements.txt` plus test dependencies.

**Rationale**: Keeps production image lean (no pytest in Docker). Developers install dev requirements locally.

### 4. Coverage target: 100% with enforcement

**Choice**: Set `--cov-fail-under=100` in pytest configuration.

**Rationale**: The codebase is small enough that 100% is achievable and maintainable. This sets the standard from day one. As the project grows, if specific files need exemptions they can use `# pragma: no cover` with a comment explaining why.

### 5. Configuration in `pyproject.toml`

**Choice**: Add `[tool.pytest.ini_options]` and `[tool.coverage]` sections to a new `pyproject.toml`.

**Rationale**: Single config file for all Python tooling. Standard modern Python practice. Avoids separate `pytest.ini`, `setup.cfg`, `.coveragerc` files.

### 6. CI coverage gate

**Choice**: Add a `test` job to the existing `ci.yml` workflow that runs `pytest --cov --cov-fail-under=100` before the Docker build.

**Rationale**: Fails fast before spending time on Docker build. Coverage gate prevents merging untested code.

## Risks / Trade-offs

- **100% coverage can incentivize low-value tests** → Mitigated by reviewing test quality, not just coverage numbers. Pragmatic `# pragma: no cover` allowed with justification.
- **Tests depend on Django internals (settings, URL resolution)** → These are stable Django APIs unlikely to break across minor versions.
- **SQLite test DB differs from production PostgreSQL** → Acceptable for unit/integration tests at this stage. Add PostgreSQL test DB later if needed for DB-specific features.
