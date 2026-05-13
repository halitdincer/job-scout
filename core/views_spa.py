"""Catch-all view that serves the SPA bundle built by Vite into frontend/dist."""

from pathlib import Path

from django.contrib.auth import views as auth_views
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods


def _spa_index_path() -> Path:
    return Path(settings.BASE_DIR) / "frontend" / "dist" / "index.html"


@ensure_csrf_cookie
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


@require_http_methods(["GET", "POST"])
def spa_login(request):
    if request.method == "POST":
        return auth_views.LoginView.as_view()(request)
    return spa_index(request)
