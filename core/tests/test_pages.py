import pytest
from django.test import Client

from core.models import Run, Source


@pytest.mark.django_db
class TestJobsPage:
    def test_renders_jobs_template(self):
        client = Client()
        response = client.get("/")
        assert response.status_code == 200
        assert "core/jobs.html" in [t.name for t in response.templates]

    def test_contains_grid_container(self):
        client = Client()
        response = client.get("/")
        assert b'id="jobs-grid"' in response.content

    def test_contains_tabulator_script(self):
        client = Client()
        response = client.get("/")
        assert b"new Tabulator" in response.content

    def test_base_includes_tabulator_cdn(self):
        client = Client()
        response = client.get("/")
        assert b"tabulator-tables" in response.content

    def test_full_bleed_layout(self):
        client = Client()
        response = client.get("/")
        assert b'class="full-bleed"' in response.content

    def test_contains_advanced_filter_panel_controls(self):
        client = Client()
        response = client.get("/")
        assert b'id="open-filters-panel"' in response.content
        assert b'id="filters-panel"' in response.content
        assert b'id="advanced-filter-summary"' in response.content

    def test_contains_quick_filters_section_in_panel(self):
        client = Client()
        response = client.get("/")
        assert b"Quick Filters" in response.content
        assert b'id="quick-filter-rows"' in response.content

    def test_contains_columns_side_panel_controls(self):
        client = Client()
        response = client.get("/")
        assert b'id="open-columns-panel"' in response.content
        assert b'id="columns-side-panel"' in response.content

    def test_does_not_render_legacy_column_dropdown(self):
        client = Client()
        response = client.get("/")
        assert b'id="col-chooser-btn"' not in response.content
        assert b'id="col-chooser-panel"' not in response.content

    def test_does_not_use_text_header_filter_inputs(self):
        client = Client()
        response = client.get("/")
        assert b'headerFilter: "input"' not in response.content
        assert b'headerFilterPlaceholder' not in response.content


@pytest.mark.django_db
class TestSourcesPage:
    def test_renders_sources_template(self):
        client = Client()
        response = client.get("/sources/")
        assert response.status_code == 200
        assert "core/sources.html" in [t.name for t in response.templates]

    def test_context_has_sources(self):
        Source.objects.create(name="Airbnb", platform="greenhouse", board_id="airbnb")
        client = Client()
        response = client.get("/sources/")
        assert len(response.context["sources"]) == 1

    def test_empty_state(self):
        client = Client()
        response = client.get("/sources/")
        assert b"No sources configured." in response.content


@pytest.mark.django_db
class TestRunsPage:
    def test_renders_runs_template(self):
        client = Client()
        response = client.get("/runs/")
        assert response.status_code == 200
        assert "core/runs.html" in [t.name for t in response.templates]

    def test_context_has_runs_ordered_desc(self):
        Run.objects.create(status="completed")
        Run.objects.create(status="pending")
        client = Client()
        response = client.get("/runs/")
        runs = list(response.context["runs"])
        assert len(runs) == 2
        assert runs[0].id > runs[1].id

    def test_empty_state(self):
        client = Client()
        response = client.get("/runs/")
        assert b"No ingestion runs yet." in response.content
