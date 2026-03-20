## ADDED Requirements

### Requirement: Login page for existing users
The system SHALL expose a login page that accepts username and password and authenticates against Django's built-in user model.

#### Scenario: Login page is accessible
- **WHEN** an unauthenticated user visits the login URL
- **THEN** the system returns HTTP 200 and renders a login form

#### Scenario: Valid credentials create session
- **WHEN** a user created in Django admin submits valid username and password
- **THEN** the system authenticates the user and redirects them to the configured post-login page

#### Scenario: Invalid credentials are rejected
- **WHEN** a user submits an invalid username or password
- **THEN** the system does not create a session and re-renders the login form with an authentication error

### Requirement: No self-service signup
The system SHALL NOT expose a user registration page or registration endpoint for anonymous visitors.

#### Scenario: Signup route is unavailable
- **WHEN** a visitor attempts to access a common signup URL
- **THEN** the system responds with HTTP 404
