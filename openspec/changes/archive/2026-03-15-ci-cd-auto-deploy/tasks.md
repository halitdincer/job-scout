## 1. CI Workflow Cleanup

- [x] 1.1 Rename `.github/workflows/build.yml` to `.github/workflows/ci.yml`
- [x] 1.2 Verify workflow YAML is correct (triggers, build, push steps)

## 2. Documentation

- [x] 2.1 Update README.md with deployment flow section: merge to main → GHA builds/pushes to GHCR → ArgoCD Image Updater detects digest change → ArgoCD auto-syncs and redeploys
