import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from core import views_spa


@pytest.mark.django_db
class TestJobsPage:
    def _authenticated_client(self):
        user = get_user_model().objects.create_user(
            username="jobs-user",
            password="safe-test-password-123",
        )
        client = Client()
        client.force_login(user)
        return client

    def test_redirects_unauthenticated_user_to_login(self):
        client = Client()
        response = client.get("/")
        assert response.status_code == 302
        assert response.url == "/accounts/login/?next=/"

    def _stub_spa_bundle(self, monkeypatch, tmp_path):
        index = tmp_path / "index.html"
        index.write_text(
            '<!doctype html><html><body><div id="root"></div></body></html>'
        )
        monkeypatch.setattr(views_spa, "_spa_index_path", lambda: index)

    def test_serves_spa_shell_for_authenticated_user(
        self, tmp_path, monkeypatch
    ):
        self._stub_spa_bundle(monkeypatch, tmp_path)
        client = self._authenticated_client()
        response = client.get("/")
        assert response.status_code == 200
        assert response["Content-Type"].startswith("text/html")
        assert b'<div id="root">' in response.content
        assert response.templates == []


@pytest.mark.django_db
class TestSourcesPage:
    """`/sources/` is served by the SPA shell. Source rendering moved to
    React; Django keeps the login_required gate and serves index.html."""

    def _authenticated_client(self):
        user = get_user_model().objects.create_user(
            username="sources-user",
            password="safe-test-password-123",
        )
        client = Client()
        client.force_login(user)
        return client

    def test_redirects_unauthenticated_user_to_login(self):
        client = Client()
        response = client.get("/sources/")
        assert response.status_code == 302
        assert response.url == "/accounts/login/?next=/sources/"

    def test_serves_spa_shell_for_authenticated_user(
        self, tmp_path, monkeypatch
    ):
        index = tmp_path / "index.html"
        index.write_text(
            '<!doctype html><html><body><div id="root"></div></body></html>'
        )
        monkeypatch.setattr(views_spa, "_spa_index_path", lambda: index)
        client = self._authenticated_client()
        response = client.get("/sources/")
        assert response.status_code == 200
        assert response["Content-Type"].startswith("text/html")
        assert b'<div id="root">' in response.content
        assert response.templates == []


@pytest.mark.django_db
class TestRunsPage:
    """`/runs/` is served by the SPA shell. Data + rendering moved to React;
    server-side responsibilities here are just (a) login_required gating and
    (b) returning the built index.html for authenticated users."""

    def _authenticated_client(self):
        user = get_user_model().objects.create_user(
            username="runs-user",
            password="safe-test-password-123",
        )
        client = Client()
        client.force_login(user)
        return client

    def _stub_spa_bundle(self, monkeypatch, tmp_path):
        index = tmp_path / "index.html"
        index.write_text(
            '<!doctype html><html><body><div id="root"></div></body></html>'
        )
        monkeypatch.setattr(views_spa, "_spa_index_path", lambda: index)

    def test_redirects_unauthenticated_user_to_login(self):
        client = Client()
        response = client.get("/runs/")
        assert response.status_code == 302
        assert response.url == "/accounts/login/?next=/runs/"

    def test_serves_spa_shell_for_authenticated_user(
        self, tmp_path, monkeypatch
    ):
        self._stub_spa_bundle(monkeypatch, tmp_path)
        client = self._authenticated_client()
        response = client.get("/runs/")
        assert response.status_code == 200
        assert response["Content-Type"].startswith("text/html")
        assert b'<div id="root">' in response.content
        # The page is now rendered by React — no Django template should be
        # involved in the response.
        assert response.templates == []


@pytest.mark.django_db
class TestAuthenticationPages:
    def test_login_page_serves_spa_shell_and_sets_csrf_cookie(
        self, tmp_path, monkeypatch
    ):
        index = tmp_path / "index.html"
        index.write_text(
            '<!doctype html><html><body><div id="root"></div></body></html>'
        )
        monkeypatch.setattr(views_spa, "_spa_index_path", lambda: index)
        client = Client()
        response = client.get("/accounts/login/")
        assert response.status_code == 200
        assert response["Content-Type"].startswith("text/html")
        assert b'<div id="root">' in response.content
        assert "csrftoken" in response.cookies
        assert response.templates == []

    def test_valid_credentials_create_session(self):
        user = get_user_model().objects.create_user(
            username="admin-created-user",
            password="safe-test-password-123",
        )
        client = Client()
        response = client.post(
            "/accounts/login/",
            {
                "username": user.username,
                "password": "safe-test-password-123",
            },
        )
        assert response.status_code == 302
        assert response.url == "/"
        assert "_auth_user_id" in client.session

    def test_invalid_credentials_do_not_create_session(
        self, tmp_path, monkeypatch
    ):
        # On POST failure the server re-serves the SPA shell with status 200;
        # the React form distinguishes success (302) from failure (200) and
        # renders its own inline error. No legacy Django template is involved.
        index = tmp_path / "index.html"
        index.write_text(
            '<!doctype html><html><body><div id="root"></div></body></html>'
        )
        monkeypatch.setattr(views_spa, "_spa_index_path", lambda: index)
        get_user_model().objects.create_user(
            username="admin-created-user",
            password="safe-test-password-123",
        )
        client = Client()
        response = client.post(
            "/accounts/login/",
            {
                "username": "admin-created-user",
                "password": "wrong-password",
            },
        )
        assert response.status_code == 200
        assert b'<div id="root">' in response.content
        assert "_auth_user_id" not in client.session

    def test_post_login_with_unsafe_next_redirects_to_root(self):
        # Defence in depth: a hostile `next=http://evil.example/...` query
        # param must not turn into an open redirect. spa_login should fall
        # back to "/" when next fails Django's host/scheme allowlist.
        get_user_model().objects.create_user(
            username="safe-next-user",
            password="safe-test-password-123",
        )
        client = Client()
        response = client.post(
            "/accounts/login/?next=http://evil.example/steal",
            {
                "username": "safe-next-user",
                "password": "safe-test-password-123",
            },
        )
        assert response.status_code == 302
        assert response.url == "/"

    def test_signup_route_is_not_available(self):
        client = Client()
        response = client.get("/signup/")
        assert response.status_code == 404
