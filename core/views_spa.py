"""Catch-all view that serves the SPA bundle built by Vite into frontend/dist."""

from pathlib import Path

from django.conf import settings
from django.http import HttpResponse


def _spa_index_path() -> Path:
    return Path(settings.BASE_DIR) / "frontend" / "dist" / "index.html"


def spa_index(request):
    try:
        html = _spa_index_path().read_text()
    except FileNotFoundError:
        return HttpResponse(
            "SPA bundle missing — run `npm run build` in frontend/",
            status=503,
            content_type="text/plain",
        )
    return HttpResponse(html, content_type="text/html")
