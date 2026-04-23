import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from core.models import Run, Source


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

    def test_renders_jobs_template(self):
        client = self._authenticated_client()
        response = client.get("/")
        assert response.status_code == 200
        assert "core/jobs.html" in [t.name for t in response.templates]

    def test_contains_grid_container(self):
        client = self._authenticated_client()
        response = client.get("/")
        assert b'id="jobs-grid"' in response.content

    def test_loads_jobs_js_module(self):
        client = self._authenticated_client()
        response = client.get("/")
        assert b'type="module"' in response.content
        assert b"js/jobs.js" in response.content

    def test_does_not_inline_bootstrap_script(self):
        client = self._authenticated_client()
        response = client.get("/")
        # The entire bootstrap moved to core/static/js/jobs.js — the template
        # must no longer carry the legacy inline Tabulator initialization.
        assert b"new Tabulator" not in response.content

    def test_base_includes_tabulator_cdn(self):
        client = self._authenticated_client()
        response = client.get("/")
        assert b"tabulator-tables" in response.content

    def test_full_bleed_layout(self):
        client = self._authenticated_client()
        response = client.get("/")
        assert b'class="full-bleed"' in response.content

    def test_contains_filters_panel_controls(self):
        client = self._authenticated_client()
        response = client.get("/")
        assert b'id="open-filters-panel"' in response.content
        assert b'id="filters-panel"' in response.content
        assert b'id="advanced-filter-summary"' in response.content

    def test_contains_per_column_filter_sections(self):
        client = self._authenticated_client()
        response = client.get("/")
        assert b'id="column-filter-sections"' in response.content
        assert b"Per-column filter rules" in response.content

    def test_contains_columns_side_panel_controls(self):
        client = self._authenticated_client()
        response = client.get("/")
        assert b'id="open-columns-panel"' in response.content
        assert b'id="columns-side-panel"' in response.content

    def test_does_not_render_legacy_column_dropdown(self):
        client = self._authenticated_client()
        response = client.get("/")
        assert b'id="col-chooser-btn"' not in response.content
        assert b'id="col-chooser-panel"' not in response.content

    def test_does_not_contain_group_builder_controls(self):
        client = self._authenticated_client()
        response = client.get("/")
        assert b'id="root-group-op"' not in response.content
        assert b'id="add-root-group"' not in response.content
        assert b"Add Group" not in response.content
        assert b"Advanced Logic" not in response.content

    def test_contains_column_filter_popover_element(self):
        client = self._authenticated_client()
        response = client.get("/")
        assert b'id="col-filter-popover"' in response.content

    def test_contains_reset_columns_button(self):
        client = self._authenticated_client()
        response = client.get("/")
        assert b'id="reset-columns"' in response.content
        assert b">Reset<" in response.content

    def test_contains_pagination_bar(self):
        client = self._authenticated_client()
        response = client.get("/")
        assert b'id="pagination-bar"' in response.content
        assert b'id="page-size-select"' in response.content
        assert b'id="page-prev"' in response.content
        assert b'id="page-next"' in response.content
        assert b'id="page-info"' in response.content

    def test_pagination_size_selector_allowlist(self):
        client = self._authenticated_client()
        response = client.get("/")
        for size in (25, 50, 100, 250):
            assert f'value="{size}"'.encode() in response.content


@pytest.mark.django_db
class TestSourcesPage:
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

    def test_renders_sources_template(self):
        client = self._authenticated_client()
        response = client.get("/sources/")
        assert response.status_code == 200
        assert "core/sources.html" in [t.name for t in response.templates]

    def test_context_has_sources(self):
        Source.objects.all().delete()
        Source.objects.create(
            name="Airbnb", platform="greenhouse", board_id="airbnb-page"
        )
        client = self._authenticated_client()
        response = client.get("/sources/")
        assert len(response.context["sources"]) == 1

    def test_empty_state(self):
        Source.objects.all().delete()
        client = self._authenticated_client()
        response = client.get("/sources/")
        assert b"No sources configured." in response.content


@pytest.mark.django_db
class TestRunsPage:
    def _authenticated_client(self):
        user = get_user_model().objects.create_user(
            username="runs-user",
            password="safe-test-password-123",
        )
        client = Client()
        client.force_login(user)
        return client

    def test_redirects_unauthenticated_user_to_login(self):
        client = Client()
        response = client.get("/runs/")
        assert response.status_code == 302
        assert response.url == "/accounts/login/?next=/runs/"

    def test_renders_runs_template(self):
        client = self._authenticated_client()
        response = client.get("/runs/")
        assert response.status_code == 200
        assert "core/runs.html" in [t.name for t in response.templates]

    def test_context_has_runs_ordered_desc(self):
        Run.objects.create(status="completed")
        Run.objects.create(status="pending")
        client = self._authenticated_client()
        response = client.get("/runs/")
        runs = list(response.context["runs"])
        assert len(runs) == 2
        assert runs[0].id > runs[1].id

    def test_error_message_shown_for_failed_run(self):
        Run.objects.create(status="failed", error_message="Connection refused")
        client = self._authenticated_client()
        response = client.get("/runs/")
        assert b"Connection refused" in response.content

    def test_empty_state(self):
        client = self._authenticated_client()
        response = client.get("/runs/")
        assert b"No ingestion runs yet." in response.content


@pytest.mark.django_db
class TestAuthenticationPages:
    def test_login_page_renders_form(self):
        client = Client()
        response = client.get("/accounts/login/")
        assert response.status_code == 200
        assert b'name="username"' in response.content
        assert b'name="password"' in response.content

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
