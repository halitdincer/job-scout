## Why

The project needs a reliable end-to-end deployment pipeline: merge to main triggers a Docker image build/push to GHCR, and the homeserver K3s cluster automatically picks up the new image. Most of this infrastructure already exists (GHA `build.yml`, ArgoCD Image Updater CR, ArgoCD app with auto-sync) but needs minor cleanup and documentation.

## What Changes

- Rename `.github/workflows/build.yml` to `.github/workflows/ci.yml` for clarity
- Verify the existing ArgoCD Image Updater CR and ArgoCD app are correctly configured (they are — no changes needed)
- Document the end-to-end deployment flow in the README

## Capabilities

### New Capabilities
- `auto-deploy-pipeline`: End-to-end CI/CD from merge-to-main through to K3s deployment via GHCR + ArgoCD Image Updater

### Modified Capabilities

_None._

## Impact

- **This repo**: Rename GHA workflow file, update README with deployment docs
- **homeserver-iac**: No changes needed — ArgoCD Image Updater CR and ArgoCD app already configured correctly
