## Context

The CI/CD pipeline is largely already in place:
- **GHA `build.yml`** builds and pushes Docker image to `ghcr.io/halitdincer/job-scout` on main branch pushes
- **ArgoCD Image Updater CR** (`k3s-manifests/apps/job-scout-image-updater.yaml`) watches the image by digest and triggers redeployment
- **ArgoCD app** (`argocd-apps/job-scout-app.yaml`) has auto-sync with prune and self-heal enabled

The pipeline works end-to-end: push to main → GHA builds/pushes image → Image Updater detects digest change → ArgoCD redeploys. The only gap is naming cleanup and documentation.

Committing and pushing changes is handled separately by the `/push-change` command.

## Goals / Non-Goals

**Goals:**
- Rename `build.yml` to `ci.yml` for consistency
- Document the end-to-end deployment flow

**Non-Goals:**
- Changing the ArgoCD Image Updater setup (already working)
- Adding tests to CI (future change)
- Setting up PR-based deployment previews
- Commit/push workflow (handled by `/push-change` command)

## Decisions

### 1. Workflow file naming
**Decision:** Rename `build.yml` to `ci.yml`.

**Rationale:** User preference. `ci.yml` is a more standard name and will accommodate future CI steps (tests, linting).

## Risks / Trade-offs

- **[No automated tests in CI yet]** → The pipeline pushes images without running tests. Acceptable for now; tests will be added in a future change.
