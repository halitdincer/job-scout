# ---- Frontend build stage ----
FROM node:20-slim AS frontend

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY frontend/ ./
RUN npm run build

# ---- Python build stage ----
FROM python:3.13-slim AS builder

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ---- Runtime ----
FROM python:3.13-slim

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=builder /usr/local/bin/gunicorn /usr/local/bin/gunicorn

COPY . .
COPY --from=frontend /app/frontend/dist ./frontend/dist

RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "jobscout.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "300"]
