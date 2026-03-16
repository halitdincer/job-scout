## ADDED Requirements

### Requirement: Health endpoint test coverage
The system SHALL have tests that verify the health check endpoint returns HTTP 200 with `{"status": "ok"}`.

#### Scenario: Health endpoint returns 200 OK
- **WHEN** a GET request is made to `/api/health` in the test client
- **THEN** the response status code is 200 and the JSON body is `{"status": "ok"}`

### Requirement: URL routing test coverage
The system SHALL have tests that verify all URL patterns resolve to their correct views.

#### Scenario: Health URL resolves to health view
- **WHEN** the URL `/api/health` is resolved
- **THEN** it maps to `core.views.health`

#### Scenario: Admin URL resolves
- **WHEN** the URL `/admin/` is resolved
- **THEN** it maps to the Django admin site

### Requirement: Settings test coverage
The system SHALL have tests that verify environment variable handling for `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, and `DATABASE_URL`.

#### Scenario: Settings load with defaults
- **WHEN** Django settings are loaded without environment overrides
- **THEN** `DEBUG` is `True`, `ALLOWED_HOSTS` contains `localhost` and `127.0.0.1`, and `SECRET_KEY` is set

#### Scenario: Installed apps include core
- **WHEN** Django settings are loaded
- **THEN** `INSTALLED_APPS` includes `core`

### Requirement: App configuration test coverage
The system SHALL have tests that verify the `core` app is properly configured.

#### Scenario: Core app config
- **WHEN** the `core` app config is loaded
- **THEN** `CoreConfig.name` is `"core"`
