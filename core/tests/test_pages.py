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

    def test_legacy_escape_renders_jobs_template(self):
        client = self._authenticated_client()
        response = client.get("/?legacy=1")
        assert response.status_code == 200
        assert "core/jobs.html" in [t.name for t in response.templates]

    def test_contains_grid_container(self):
        client = self._authenticated_client()
        response = client.get("/?legacy=1")
        assert b'id="jobs-grid"' in response.content

    def test_loads_jobs_js_module(self):
        client = self._authenticated_client()
        response = client.get("/?legacy=1")
        assert b'type="module"' in response.content
        assert b"js/jobs.js" in response.content

    def test_does_not_inline_bootstrap_script(self):
        client = self._authenticated_client()
        response = client.get("/?legacy=1")
        # The entire bootstrap moved to core/static/js/jobs.js — the template
        # must no longer carry the legacy inline Tabulator initialization.
        assert b"new Tabulator" not in response.content

    def test_base_includes_tabulator_cdn(self):
        client = self._authenticated_client()
        response = client.get("/?legacy=1")
        assert b"tabulator-tables" in response.content

    def test_full_bleed_layout(self):
        client = self._authenticated_client()
        response = client.get("/?legacy=1")
        assert b'class="full-bleed"' in response.content

    def test_contains_merged_columns_and_filters_panel(self):
        client = self._authenticated_client()
        response = client.get("/?legacy=1")
        # The old Columns panel and pill summary bar were merged into a
        # single "Columns & Filters" side panel on the filter refactor.
        assert b'id="open-filters-panel"' in response.content
        assert b'id="filters-panel"' in response.content
        assert b"Columns &amp; Filters" in response.content

    def test_contains_per_column_filter_sections(self):
        client = self._authenticated_client()
        response = client.get("/?legacy=1")
        assert b'id="column-filter-sections"' in response.content
        assert b"Toggle visibility and set per-column filter rules" in response.content

    def test_does_not_render_legacy_columns_panel(self):
        client = self._authenticated_client()
        response = client.get("/?legacy=1")
        # The dedicated Columns side panel was removed — everything now
        # lives in #filters-panel.
        assert b'id="open-columns-panel"' not in response.content
        assert b'id="columns-side-panel"' not in response.content

    def test_does_not_render_filter_pills_summary(self):
        client = self._authenticated_client()
        response = client.get("/?legacy=1")
        # Pills were replaced by inline header filter inputs + the
        # merged panel; the old summary bar must be gone.
        assert b'id="advanced-filter-summary"' not in response.content

    def test_does_not_render_legacy_column_dropdown(self):
        client = self._authenticated_client()
        response = client.get("/?legacy=1")
        assert b'id="col-chooser-btn"' not in response.content
        assert b'id="col-chooser-panel"' not in response.content

    def test_does_not_contain_group_builder_controls(self):
        client = self._authenticated_client()
        response = client.get("/?legacy=1")
        assert b'id="root-group-op"' not in response.content
        assert b'id="add-root-group"' not in response.content
        assert b"Add Group" not in response.content
        assert b"Advanced Logic" not in response.content

    def test_does_not_contain_legacy_column_filter_popover(self):
        client = self._authenticated_client()
        response = client.get("/?legacy=1")
        # Popover element was dead code and was removed.
        assert b'id="col-filter-popover"' not in response.content

    def test_contains_reset_columns_button(self):
        client = self._authenticated_client()
        response = client.get("/?legacy=1")
        # Reset button now lives inside the merged Columns & Filters panel.
        assert b'id="reset-columns"' in response.content
        assert b">Reset<" in response.content

    def test_contains_pagination_bar(self):
        client = self._authenticated_client()
        response = client.get("/?legacy=1")
        assert b'id="pagination-bar"' in response.content
        assert b'id="page-size-select"' in response.content
        assert b'id="page-prev"' in response.content
        assert b'id="page-next"' in response.content
        assert b'id="page-info"' in response.content

    def test_pagination_size_selector_allowlist(self):
        client = self._authenticated_client()
        response = client.get("/?legacy=1")
        for size in (25, 50, 100, 250):
            assert f'value="{size}"'.encode() in response.content


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

    def test_invalid_credentials_do_not_create_session(self):
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
        assert b"Please enter a correct username and password" in response.content
        assert "_auth_user_id" not in client.session

    def test_signup_route_is_not_available(self):
        client = Client()
        response = client.get("/signup/")
        assert response.status_code == 404
