# Deployment

## How it works

Push to `main` is the only step ever needed. The rest is automatic.

```
git push origin main
  → GitHub Actions (.github/workflows/docker.yml)
      builds multi-stage Docker image
      pushes to ghcr.io/halitdincer/job-scout:latest
  → ArgoCD Image Updater (K3s, ~1 min polling)
      detects new image digest
  → ArgoCD syncs the job-scout Application
      K3s performs a rolling pod replacement
```

End-to-end time: **~4 minutes**.

## What lives where

| Thing | Location |
|---|---|
| App code | this repo (`main` branch) |
| Docker image | `ghcr.io/halitdincer/job-scout:latest` |
| K8s manifests | `homeserver-iac/k3s-manifests/job-scout/` (kustomize) |
| Secrets | `job-scout-secret` on K3s — managed manually, never in code |

## Changing K8s config (resource limits, env vars, replicas)

Edit files in `~/Developers/homeserver-iac/k3s-manifests/job-scout/` and push to `homeserver-iac/main`. ArgoCD picks it up in ~3 min.

## Rules

- **Never** run `kubectl apply`, `kubectl rollout restart`, or push images manually
- **Never** `kubectl edit` live resources — ArgoCD `selfHeal` will revert them
- **Never** commit real secret values — `SESSION_SECRET` and `ANTHROPIC_API_KEY` live only in the K8s secret

## Checking deployment status

```bash
# Watch CI
gh run watch

# Check pod on cluster
ssh -i ~/.ssh/homeserver_ed25519 root@192.168.2.216
kubectl get pods -n job-scout
kubectl logs -n job-scout -l app=job-scout -f

# Live site
open https://jobs.halitdincer.com
```
