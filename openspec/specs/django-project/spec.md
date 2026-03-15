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
