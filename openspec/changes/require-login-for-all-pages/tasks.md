## 1. Authentication specs and failing tests

- [x] 1.1 Add tests for login page rendering, valid login, and invalid login behavior using Django auth users created in test setup
- [x] 1.2 Add tests that anonymous requests to `/` are redirected to the login page
- [x] 1.3 Update/add tests confirming authenticated users can still access `/` and see existing jobs-page behavior
- [x] 1.4 Add tests asserting there is no signup route exposed (for example `/signup/` returns 404)

## 2. Implement login flow and route protection

- [x] 2.1 Add authentication URL routes for login (and logout if needed by current navigation)
- [x] 2.2 Create login template with username/password form and error display using Django auth view context
- [x] 2.3 Protect user-facing page views with login-required behavior while leaving intended public endpoints unchanged
- [x] 2.4 Configure `LOGIN_URL` and post-login redirect settings to support the desired redirect flow

## 3. Verification and cleanup

- [x] 3.1 Run `pytest` and fix any regressions while keeping coverage at 100%
- [x] 3.2 Refactor authentication-related view/template code for clarity without changing behavior
- [x] 3.3 Manually verify browser flow: anonymous user redirected to login, admin-created user can sign in, and no signup UI is available
