"""Catch-all view that serves the SPA bundle built by Vite into frontend/dist."""

from pathlib import Path

from django.conf import settings
from django.contrib.auth import authenticate, login
from django.contrib.auth.forms import AuthenticationForm
from django.http import HttpResponse, HttpResponseRedirect
from django.utils.http import url_has_allowed_host_and_scheme
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
    # GET: hand the SPA shell to the browser; React renders the login form.
    # POST: authenticate the credentials ourselves so failure doesn't fall
    # through to Django's LoginView (which would try to render the now-
    # deleted registration/login.html template). On success we 302 to the
    # `next` URL the React form posted; on failure we re-serve the SPA shell
    # with status 200, and the React form treats non-302 as the error path.
    if request.method != "POST":
        return spa_index(request)

    form = AuthenticationForm(request, data=request.POST)
    if form.is_valid():
        user = authenticate(
            request,
            username=form.cleaned_data["username"],
            password=form.cleaned_data["password"],
        )
        if user is not None:
            login(request, user)
            next_url = request.POST.get("next") or request.GET.get("next") or "/"
            if not url_has_allowed_host_and_scheme(
                next_url, allowed_hosts={request.get_host()}
            ):
                next_url = "/"
            return HttpResponseRedirect(next_url)
    return spa_index(request)
