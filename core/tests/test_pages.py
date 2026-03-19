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

    def test_contains_filters_panel_controls(self):
        client = Client()
        response = client.get("/")
        assert b'id="open-filters-panel"' in response.content
        assert b'id="filters-panel"' in response.content
        assert b'id="advanced-filter-summary"' in response.content

    def test_contains_per_column_filter_sections(self):
        client = Client()
        response = client.get("/")
        assert b'id="column-filter-sections"' in response.content
        assert b"Per-column filter rules" in response.content

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

    def test_does_not_contain_group_builder_controls(self):
        client = Client()
        response = client.get("/")
        assert b'id="root-group-op"' not in response.content
        assert b'id="add-root-group"' not in response.content
        assert b"Add Group" not in response.content
        assert b"Advanced Logic" not in response.content

    def test_contains_column_filter_popover_element(self):
        client = Client()
        response = client.get("/")
        assert b'id="col-filter-popover"' in response.content

    def test_tabulator_has_movable_columns_enabled(self):
        client = Client()
        response = client.get("/")
        assert b"movableColumns: true" in response.content

    def test_contains_column_order_persistence_key(self):
        client = Client()
        response = client.get("/")
        assert b"jobscout_column_order" in response.content

    def test_contains_column_moved_event_handler(self):
        client = Client()
        response = client.get("/")
        assert b"columnMoved" in response.content

    def test_contains_column_order_restore_logic(self):
        client = Client()
        response = client.get("/")
        assert b"applyPersistedColumnOrder" in response.content

    def test_contains_reset_columns_button(self):
        client = Client()
        response = client.get("/")
        assert b'id="reset-columns"' in response.content
        assert b"Reset Columns" in response.content

    def test_contains_reset_columns_click_handler(self):
        client = Client()
        response = client.get("/")
        assert b"resetColumnOrder" in response.content

    def test_contains_multi_select_header_filter_function(self):
        client = Client()
        response = client.get("/")
        assert b"multiSelectHeaderFilter" in response.content

    def test_contains_multi_select_filter_function(self):
        client = Client()
        response = client.get("/")
        assert b"multiSelectFilter" in response.content

    def test_contains_empty_sentinel(self):
        client = Client()
        response = client.get("/")
        assert b"EMPTY_SENTINEL" in response.content

    def test_columns_use_multi_select_header_filter(self):
        client = Client()
        response = client.get("/")
        content = response.content.decode()
        assert "headerFilter: multiSelectHeaderFilter" in content

    def test_does_not_use_list_header_filter_for_categorical(self):
        client = Client()
        response = client.get("/")
        content = response.content.decode()
        # Date columns still use "list", but categorical/array should not
        assert 'field: "source_name"' in content
        # Company should use multiSelectHeaderFilter, not "list"
        lines = content.split("\n")
        for line in lines:
            if "source_name" in line and "headerFilter" in line:
                assert "multiSelectHeaderFilter" in line
                break

    def test_contains_header_filter_to_rules_function(self):
        client = Client()
        response = client.get("/")
        assert b"headerFilterToRules" in response.content

    def test_contains_select_all_label(self):
        client = Client()
        response = client.get("/")
        assert b"Select All" in response.content

    def test_contains_empty_option_label(self):
        client = Client()
        response = client.get("/")
        assert b'"(Empty)"' in response.content

    def test_contains_ms_dropdown_class(self):
        client = Client()
        response = client.get("/")
        assert b"ms-dropdown" in response.content

    def test_data_filtered_handles_filter_removal(self):
        client = Client()
        response = client.get("/")
        assert b"needsServerRefetch" in response.content

    def test_contains_collect_unique_values_function(self):
        client = Client()
        response = client.get("/")
        assert b"collectUniqueValues" in response.content

    def test_contains_label_to_key_function(self):
        client = Client()
        response = client.get("/")
        assert b"labelToKey" in response.content

    def test_contains_date_header_normalizer(self):
        client = Client()
        response = client.get("/")
        assert b"normalizeDateHeaderValue" in response.content

    def test_company_filter_supports_in_operator(self):
        client = Client()
        response = client.get("/")
        assert b'source_name: { label: "Company", type: "text", operators: ["contains", "eq", "neq", "in", "not_in"' in response.content


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
