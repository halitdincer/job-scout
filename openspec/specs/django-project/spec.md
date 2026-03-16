## ADDED Requirements

### Requirement: Django project skeleton
The system SHALL have a Django project named `jobscout` with a `core` app, configured with standard Django settings, URL routing, WSGI entry point, and Gunicorn as the production server.

#### Scenario: Project starts locally
- **WHEN** the developer runs `python manage.py runserver`
- **THEN** Django starts on port 8000 and responds to HTTP requests

#### Scenario: Project starts in production
- **WHEN** the container runs `gunicorn jobscout.wsgi:application --bind 0.0.0.0:8000`
- **THEN** Gunicorn serves the Django application on port 8000

### Requirement: Health check endpoint
The system SHALL expose a health check endpoint at `GET /api/health` that returns HTTP 200 with a JSON body `{"status": "ok"}`.

#### Scenario: Health check returns OK
- **WHEN** a GET request is made to `/api/health`
- **THEN** the response status is 200 and the body is `{"status": "ok"}`

### Requirement: PostgreSQL database connection
The system SHALL connect to PostgreSQL using the `DATABASE_URL` environment variable, parsed by `dj-database-url`. In local development, the default SHALL fall back to `postgres://postgres:postgres@localhost:5432/jobscout`.

#### Scenario: Database connection via environment variable
- **WHEN** `DATABASE_URL` is set to a valid PostgreSQL connection string
- **THEN** Django connects to that PostgreSQL database

#### Scenario: Default database for local development
- **WHEN** `DATABASE_URL` is not set
- **THEN** Django connects to `postgres://postgres:postgres@localhost:5432/jobscout`

### Requirement: Settings via environment variables
The system SHALL read `SECRET_KEY`, `DEBUG`, and `ALLOWED_HOSTS` from environment variables with sensible development defaults.

#### Scenario: Production settings override
- **WHEN** `SECRET_KEY`, `DEBUG=False`, and `ALLOWED_HOSTS=jobs.halitdincer.com` are set
- **THEN** Django uses those values instead of defaults

### Requirement: Static files served via Whitenoise
The system SHALL use `whitenoise` middleware to serve static files in production without a separate web server.

#### Scenario: Static files accessible
- **WHEN** `python manage.py collectstatic` has been run
- **THEN** static files are served at `/static/` by the Django application

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
