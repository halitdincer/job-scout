## Context

The project is a Django application where the jobs UI at `/` is currently accessible without authentication. Users are already managed through Django admin, and there is no product requirement for self-service account creation. This change needs to gate all user-facing pages behind login while keeping the operational model simple (admin-created users only).

## Goals / Non-Goals

**Goals:**
- Require authenticated sessions for all app pages that expose job data.
- Provide a first-party login page using Django's built-in authentication.
- Keep account provisioning in Django admin only.
- Preserve existing admin site behavior and existing authenticated page functionality.

**Non-Goals:**
- Building a signup, invitation, password reset, or social-login flow.
- Introducing custom authentication providers or third-party auth dependencies.
- Protecting endpoints that are intentionally public infrastructure checks (for example, health checks) unless specified by existing specs.

## Decisions

- Use Django's built-in auth views (`LoginView` and `LogoutView`) and session middleware.
  - Rationale: Native, secure defaults and minimal custom code.
  - Alternatives considered: custom login view (more flexibility but unnecessary complexity).
- Enforce page protection with `LoginRequiredMixin`/`login_required` on app page views and set `LOGIN_URL`/`LOGIN_REDIRECT_URL` in settings.
  - Rationale: Clear and explicit access control at the view layer.
  - Alternatives considered: custom middleware to block all non-authenticated requests globally (harder to scope exceptions like health/admin).
- Do not add any registration route/template.
  - Rationale: Product requirement is admin-managed users only.
  - Alternatives considered: hidden signup endpoint (rejected to avoid accidental exposure).
- Add tests for authenticated and unauthenticated access paths.
  - Rationale: Access control regressions are high-risk and must be covered under strict TDD and coverage requirements.

## Risks / Trade-offs

- [Risk] Protecting all pages may accidentally lock out required anonymous endpoints. -> Mitigation: Scope protection to user-facing pages and keep explicitly public endpoints covered by URL/view tests.
- [Risk] Redirect loops if login page itself is protected. -> Mitigation: Keep login route public and test unauthenticated access to `/accounts/login/`.
- [Risk] Existing tests that assume anonymous access to `/` will fail. -> Mitigation: Update tests first (red), then implement auth gate (green).

## Migration Plan

1. Add failing tests that define required redirects and successful authenticated access.
2. Add auth URL routes, login template, and view protection.
3. Run full `pytest` suite and fix regressions.
4. Deploy normally; no data migration required.
5. Rollback strategy: revert the change set if login gating causes production issues.

## Open Questions

- Should logout be exposed as a dedicated route immediately, or can it follow in a separate UX refinement if not currently needed in navigation?
