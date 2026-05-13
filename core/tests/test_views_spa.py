from django.test import RequestFactory

from core import views_spa


def test_spa_index_returns_html_when_bundle_exists(tmp_path, monkeypatch):
    index_file = tmp_path / "index.html"
    index_file.write_text(
        '<!doctype html><html><body><div id="root"></div></body></html>'
    )
    monkeypatch.setattr(views_spa, "_spa_index_path", lambda: index_file)

    response = views_spa.spa_index(RequestFactory().get("/"))

    assert response.status_code == 200
    assert response["Content-Type"].startswith("text/html")
    assert b'<div id="root">' in response.content
    assert "csrftoken" in response.cookies


def test_spa_index_returns_503_when_bundle_missing(tmp_path, monkeypatch):
    missing = tmp_path / "does-not-exist.html"
    monkeypatch.setattr(views_spa, "_spa_index_path", lambda: missing)

    response = views_spa.spa_index(RequestFactory().get("/"))

    assert response.status_code == 503
    assert b"npm run build" in response.content


def test_spa_index_path_points_at_frontend_dist(settings):
    # The default resolution must point at frontend/dist/index.html under
    # BASE_DIR so the production deployment serves the built SPA bundle.
    path = views_spa._spa_index_path()
    assert path == settings.BASE_DIR / "frontend" / "dist" / "index.html"
