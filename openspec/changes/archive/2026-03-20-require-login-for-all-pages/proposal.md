## Why

The app currently exposes pages without authentication, which allows anonymous visitors to access internal job data. We need to require sign-in so only users created by administrators in Django admin can use the app.

## What Changes

- Add a username/password login flow backed by Django's built-in authentication system.
- Require authentication for all user-facing app pages so unauthenticated requests are redirected to the login page.
- Keep signup disabled; no self-registration UI or endpoint is introduced.
- Preserve admin-managed user provisioning through Django admin.

## Capabilities

### New Capabilities
- `app-authentication`: Login/logout behavior and authentication gatekeeping for app pages using Django auth users.

### Modified Capabilities
- `frontend-pages`: Visiting app pages requires an authenticated session, with redirect to login when not authenticated.

## Impact

- Affected code: Django URL routing, page views, templates, and authentication settings.
- APIs: No new public API endpoints; authentication affects access behavior for HTML pages.
- Dependencies: Uses existing Django auth stack (no new third-party dependency expected).
- Operations: Users continue to be created manually through Django admin.
