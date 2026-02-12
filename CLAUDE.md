# Claude Code Instructions — job-scout

## What this project is

Job board tracker/scraper. TypeScript/Express backend + React/Vite frontend, SQLite DB, Playwright for scraping. Deployed at https://jobs.halitdincer.com on a home K3s cluster.

## Deployment pipeline — READ THIS BEFORE TOUCHING ANYTHING

**Push to `main` = automatic deploy.** No manual steps ever needed.

```
git push origin main
  → GitHub Actions builds Docker image → pushes ghcr.io/halitdincer/job-scout:latest
  → ArgoCD Image Updater (on K3s) detects new digest
  → ArgoCD syncs → K3s deploys new pod
```

### Rules

- **Never** run `kubectl apply`, `kubectl rollout restart`, or manually push Docker images
- **Never** edit K3s resources directly (`kubectl edit`) — ArgoCD `selfHeal` will revert them
- Kubernetes manifests live in the **`homeserver-iac`** repo at `k3s-manifests/job-scout/` (kustomize)
  — to change resource limits, env vars, replicas: edit those files and push to `homeserver-iac/main`
- The `job-scout-secret` K8s secret (SESSION_SECRET, ANTHROPIC_API_KEY) is managed manually on K3s — never include real secret values in code or manifests
- The `GHCR_TOKEN` is not needed — the workflow uses `GITHUB_TOKEN` automatically

## Development

```bash
npm install && npm --prefix web install
cp .env.example .env   # fill in SESSION_SECRET and ANTHROPIC_API_KEY
npm run dev            # server :3000 + Vite :5173
```

Or use Docker Compose: `docker compose up` then open http://localhost:5173

## Key files

| File | Purpose |
|---|---|
| `server/` | Express API (TypeScript) |
| `web/src/` | React frontend |
| `src/scraper.ts` | Playwright scraping engine |
| `Dockerfile` | Multi-stage production build |
| `.github/workflows/docker.yml` | CI/CD: builds + pushes to GHCR |
| `.github/workflows/ci.yml` | Tests + build check on every push/PR |

## Making changes

1. Edit code locally or in any editor
2. Test locally with `npm run dev`
3. `git push origin main` — pipeline takes ~4 min end-to-end
4. Check https://jobs.halitdincer.com

For K8s manifest changes (not code):
1. Edit `~/homeserver-iac/k3s-manifests/job-scout/*.yaml`
2. Push to `homeserver-iac/main` — ArgoCD auto-syncs within ~3 min

## SSH / cluster access (if needed for debugging)

```bash
ssh -i ~/.ssh/homeserver_ed25519 root@192.168.2.216
kubectl get pods -n job-scout
kubectl logs -n job-scout -l app=job-scout -f
```
