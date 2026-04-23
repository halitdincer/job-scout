#!/usr/bin/env bash
# Boot a deterministic Django dev server for Playwright.
#
# - SQLite on disk at e2e.sqlite3 so state persists across migrations
#   within a single test run but is rebuilt from scratch each invocation.
# - --noreload avoids the double-process / reload-mid-test footguns.
# - Port 18765 is arbitrary and picked to avoid colliding with typical
#   local dev servers.
set -euo pipefail

cd "$(dirname "$0")/.."

export DATABASE_URL="sqlite:///$(pwd)/e2e.sqlite3"
export DJANGO_SETTINGS_MODULE=jobscout.settings
export DEBUG=True
export ALLOWED_HOSTS=localhost,127.0.0.1
export SECRET_KEY=e2e-dev-only-secret

rm -f e2e.sqlite3

./.venv/bin/python manage.py migrate --no-input >/dev/null
./.venv/bin/python scripts/seed_e2e.py

exec ./.venv/bin/python manage.py runserver 127.0.0.1:18765 --noreload
