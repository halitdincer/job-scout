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

Push to `main` — GitHub Actions builds the Docker image, pushes to GHCR, then the self-hosted runner on the K3s VM runs `kubectl rollout restart`.

### One-time runner setup (already done on K3s VM)
The runner binary is at `/opt/actions-runner/` on the K3s VM (`192.168.2.216`).

To register or re-register the runner:
1. Go to https://github.com/halitdincer/job-scout/settings/actions/runners/new
2. Copy the registration token
3. SSH to K3s VM and run:
   ```bash
   ssh root@192.168.2.216
   /opt/actions-runner/register.sh <YOUR_TOKEN>
   ```
The runner installs itself as a systemd service and starts automatically on boot.

To check runner status:
```bash
ssh root@192.168.2.216 "cd /opt/actions-runner && ./svc.sh status"
```

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
