# Development Guide

## Quick Start (3 options)

### Option A — GitHub Codespaces / VS Code Remote (zero install)
1. Open repo in GitHub Codespaces or VS Code with the Remote Containers extension
2. The devcontainer builds automatically using the Playwright image
3. After the container starts, copy env vars and run:
   ```bash
   cp .env.example .env
   # edit .env with your values
   npm run dev
   ```
4. Codespaces forwards port 5173 automatically — open it in your browser

### Option B — Local install (Node + npm)
```bash
git clone https://github.com/halitdincer/job-scout.git
cd job-scout
npm install
npm --prefix web install
cp .env.example .env   # fill in values
mkdir -p data
npm run dev            # starts server on :3000 + Vite on :5173
```
Open http://localhost:5173

### Option C — Docker Compose (no Node required)
```bash
cp .env.example .env   # fill in values
docker compose up
```
Open http://localhost:5173

The server hot-reloads on changes to `src/` and `server/`.
The Vite frontend hot-reloads on changes to `web/src/`.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DB_PATH` | `./data/jobscout.sqlite` | SQLite file path |
| `PORT` | `3000` | API server port |
| `SESSION_SECRET` | — | Secret for signing session cookies |
| `ANTHROPIC_API_KEY` | — | Required for AI board setup feature |

Copy `.env.example` to `.env` and fill in your values. The `.env` file is git-ignored.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start server (hot-reload) + Vite dev server concurrently |
| `npm run dev:server` | Server only with nodemon hot-reload |
| `npm run web:dev` | Vite frontend only |
| `npm run server:build` | Compile server TypeScript to `dist-server/` |
| `npm run server:start` | Run compiled server (production mode) |
| `npm run test` | Run tests |

---

## Deploying

**Just push to `main`.** The full pipeline is automatic:

```
git push origin main
   ↓ (~2 min)
GitHub Actions: builds Docker image → pushes ghcr.io/halitdincer/job-scout:latest + :sha-<sha>
   ↓ (~2 min poll)
ArgoCD Image Updater: detects new digest on :latest
   ↓
ArgoCD: syncs job-scout Application → K3s deploys new pod
   ↓
https://jobs.halitdincer.com serves the new version
```

**Do not** manually run `kubectl apply`, `kubectl rollout restart`, or push Docker images by hand. The pipeline handles everything.

### Pipeline components (all on K3s VM, 192.168.2.216)

| Component | What it does |
|---|---|
| GitHub Actions (`.github/workflows/docker.yml`) | Builds + pushes to GHCR on every push to `main` |
| ArgoCD Image Updater | Polls GHCR every 2 min, triggers deploy on new digest |
| ArgoCD (`job-scout` Application) | Syncs `homeserver-iac/k3s-manifests/job-scout/` kustomize manifests |
| K3s | Runs the pod, serves traffic via nginx ingress |

### Kubernetes manifests

Live in `homeserver-iac` repo at `k3s-manifests/job-scout/` (kustomize).
Changes to those manifests (resource limits, env vars, etc.) deploy automatically via ArgoCD.
**Do not** edit the K3s resources directly with `kubectl edit` — ArgoCD's `selfHeal` will revert them.

---

## Project Structure

```
job-scout/
├── server/          # Express API server (TypeScript)
│   ├── app.ts       # Express app factory
│   ├── index.ts     # Server entrypoint
│   ├── cron/        # Scrape scheduler
│   └── routes/      # API route handlers
├── src/             # Shared code (storage, scraper, types)
├── web/             # React frontend (Vite + TypeScript)
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── hooks.ts
│       └── types.ts
├── .devcontainer/   # VS Code / Codespaces config
├── docker-compose.yml
├── Dockerfile       # Production multi-stage build
└── .env.example     # Environment variable template
```
