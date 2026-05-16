import json
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.test import Client, override_settings
from django.utils import timezone

from core.models import JobListing, LocationTag, Run, SavedView, SeenListing, Source


def _run_inline(run_id):
    """Test helper: execute the background worker synchronously so DB state is
    deterministic when tests inspect the Run row after POST /api/runs/."""
    from core.views import _execute_run

    _execute_run(run_id)


@pytest.mark.django_db
def test_health_returns_200_with_status_ok():
    client = Client()
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.django_db
class TestSourcesAPI:
    def test_list_sources(self):
        Source.objects.all().delete()
        Source.objects.create(
            name="Airbnb", platform="greenhouse", board_id="airbnb-view"
        )
        Source.objects.create(name="Stripe", platform="lever", board_id="stripe-view")
        client = Client()
        response = client.get("/api/sources/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["name"] == "Airbnb"
        assert data[0]["platform"] == "greenhouse"
        assert data[0]["board_id"] == "airbnb-view"
        assert data[0]["is_active"] is True
        assert "id" in data[0]


@pytest.mark.django_db
class TestJobsAPI:
    def _authenticated_client(self, username="jobs-api-user"):
        user = get_user_model().objects.create_user(
            username=username,
            password="safe-test-password-123",
        )
        client = Client()
        client.force_login(user)
        return client, user

    def _create_source_with_listings(self):
        source = Source.objects.create(
            name="Airbnb", platform="greenhouse", board_id="airbnb-jobs"
        )
        listing1 = JobListing.objects.create(
            source=source,
            external_id="1",
            title="Engineer",
            department="Eng",
            url="https://example.com/1",
            status="active",
            team="Platform",
            employment_type="full_time",
            workplace_type="remote",
        )
        tag = LocationTag.objects.create(name="SF", country_code="US", region_code="US-CA", city="San Francisco")
        listing1.locations.add(tag)
        JobListing.objects.create(
            source=source,
            external_id="2",
            title="Designer",
            url="https://example.com/2",
            status="expired",
        )
        return source

    def test_list_all_jobs(self):
        self._create_source_with_listings()
        client = Client()
        response = client.get("/api/jobs/")
        assert response.status_code == 200
        data = response.json()["results"]
        assert len(data) == 2
        assert "source_name" in data[0]
        assert "source_id" in data[0]
        assert "external_id" in data[0]

    def test_includes_enriched_fields(self):
        self._create_source_with_listings()
        client = Client()
        response = client.get("/api/jobs/")
        data = response.json()["results"]
        engineer = next(j for j in data if j["title"] == "Engineer")
        assert engineer["locations"] == [
            {
                "name": "SF",
                "country_code": "US",
                "region_code": "US-CA",
                "city": "San Francisco",
                "geo_key": "US-CA-San Francisco",
            }
        ]
        assert engineer["country"] == ["US"]
        assert engineer["region"] == ["US-CA"]
        assert engineer["city"] == ["San Francisco"]
        assert engineer["team"] == "Platform"
        assert engineer["employment_type"] == "full_time"
        assert engineer["workplace_type"] == "remote"
        assert "expired_at" in engineer
        assert "published_at" in engineer
        assert "updated_at_source" in engineer

    def test_region_and_city_with_multiple_locations(self):
        source = Source.objects.create(
            name="Test", platform="greenhouse", board_id="test"
        )
        listing = JobListing.objects.create(
            source=source,
            external_id="multi",
            title="Multi-loc",
            url="https://example.com/multi",
        )
        tag1 = LocationTag.objects.create(
            name="Toronto", country_code="CA", region_code="CA-ON", city="Toronto"
        )
        tag2 = LocationTag.objects.create(
            name="Vancouver", country_code="CA", region_code="CA-BC", city="Vancouver"
        )
        listing.locations.add(tag1, tag2)
        client = Client()
        response = client.get("/api/jobs/")
        data = response.json()["results"]
        job = next(j for j in data if j["title"] == "Multi-loc")
        assert job["country"] == ["CA"]
        assert job["region"] == ["CA-BC", "CA-ON"]
        assert job["city"] == ["Toronto", "Vancouver"]

    def test_region_and_city_empty_when_no_geo(self):
        source = Source.objects.create(
            name="Test", platform="greenhouse", board_id="test"
        )
        listing = JobListing.objects.create(
            source=source,
            external_id="nogeo",
            title="No-geo",
            url="https://example.com/nogeo",
        )
        tag = LocationTag.objects.create(name="Remote")
        listing.locations.add(tag)
        client = Client()
        response = client.get("/api/jobs/")
        data = response.json()["results"]
        job = next(j for j in data if j["title"] == "No-geo")
        assert job["country"] == []
        assert job["region"] == []
        assert job["city"] == []

    def test_filter_by_source_id(self):
        source = self._create_source_with_listings()
        other = Source.objects.create(
            name="Other", platform="lever", board_id="other"
        )
        JobListing.objects.create(
            source=other,
            external_id="99",
            title="Other Job",
            url="https://example.com/99",
        )
        client = Client()
        response = client.get(f"/api/jobs/?source_id={source.pk}")
        assert response.status_code == 200
        data = response.json()["results"]
        assert len(data) == 2
        assert all(j["source_id"] == source.pk for j in data)

    def test_filter_by_status(self):
        self._create_source_with_listings()
        client = Client()
        response = client.get("/api/jobs/?status=active")
        assert response.status_code == 200
        data = response.json()["results"]
        assert len(data) == 1
        assert data[0]["status"] == "active"

    def test_filter_expression_with_not_clause(self):
        source = Source.objects.create(
            name="Filter Co", platform="greenhouse", board_id="filterco"
        )
        JobListing.objects.create(
            source=source,
            external_id="1",
            title="Software Engineer",
            url="https://example.com/1",
            status="active",
        )
        JobListing.objects.create(
            source=source,
            external_id="2",
            title="Senior Software Engineer",
            url="https://example.com/2",
            status="active",
        )

        expression = {
            "op": "and",
            "children": [
                {"field": "title", "operator": "contains", "value": "engineer"},
                {
                    "op": "not",
                    "child": {
                        "field": "title",
                        "operator": "contains",
                        "value": "senior",
                    },
                },
            ],
        }

        client = Client()
        response = client.get(
            "/api/jobs/",
            {"filter": json.dumps(expression)},
        )

        assert response.status_code == 200
        data = response.json()["results"]
        assert [row["title"] for row in data] == ["Software Engineer"]

    def test_filter_expression_allows_multiple_predicates_same_field(self):
        source = Source.objects.create(
            name="Filter Co", platform="greenhouse", board_id="filterco"
        )
        JobListing.objects.create(
            source=source,
            external_id="1",
            title="Software Engineer",
            url="https://example.com/1",
            status="active",
        )
        JobListing.objects.create(
            source=source,
            external_id="2",
            title="Platform Engineer",
            url="https://example.com/2",
            status="active",
        )
        JobListing.objects.create(
            source=source,
            external_id="3",
            title="Software Designer",
            url="https://example.com/3",
            status="active",
        )

        expression = {
            "op": "and",
            "children": [
                {"field": "title", "operator": "contains", "value": "software"},
                {"field": "title", "operator": "contains", "value": "engineer"},
            ],
        }

        client = Client()
        response = client.get("/api/jobs/", {"filter": json.dumps(expression)})

        assert response.status_code == 200
        data = response.json()["results"]
        assert [row["title"] for row in data] == ["Software Engineer"]

    def test_filter_expression_supports_array_inclusion(self):
        source = Source.objects.create(
            name="Geo Co", platform="greenhouse", board_id="geoco"
        )
        us_listing = JobListing.objects.create(
            source=source,
            external_id="1",
            title="US Job",
            url="https://example.com/1",
            status="active",
        )
        ca_listing = JobListing.objects.create(
            source=source,
            external_id="2",
            title="CA Job",
            url="https://example.com/2",
            status="active",
        )
        us_tag = LocationTag.objects.create(name="NYC", country_code="US")
        ca_tag = LocationTag.objects.create(name="Toronto", country_code="CA")
        us_listing.locations.add(us_tag)
        ca_listing.locations.add(ca_tag)

        expression = {
            "field": "country",
            "operator": "in",
            "value": ["US"],
        }

        client = Client()
        response = client.get("/api/jobs/", {"filter": json.dumps(expression)})

        assert response.status_code == 200
        data = response.json()["results"]
        assert [row["title"] for row in data] == ["US Job"]

    def test_filter_expression_supports_raw_location_name_contains(self):
        source = Source.objects.create(
            name="Geo Co", platform="greenhouse", board_id="geoco-raw"
        )
        remote_listing = JobListing.objects.create(
            source=source,
            external_id="1",
            title="Remote Job",
            url="https://example.com/1",
            status="active",
        )
        toronto_listing = JobListing.objects.create(
            source=source,
            external_id="2",
            title="Toronto Job",
            url="https://example.com/2",
            status="active",
        )
        remote_listing.locations.add(LocationTag.objects.create(name="Remote"))
        toronto_listing.locations.add(
            LocationTag.objects.create(name="Toronto, Ontario, Canada")
        )

        expression = {
            "field": "location",
            "operator": "contains",
            "value": "toronto",
        }

        client = Client()
        response = client.get("/api/jobs/", {"filter": json.dumps(expression)})

        assert response.status_code == 200
        data = response.json()["results"]
        assert [row["title"] for row in data] == ["Toronto Job"]

    def test_filter_expression_can_combine_with_legacy_quick_filters(self):
        source = Source.objects.create(
            name="Blend Co", platform="greenhouse", board_id="blendco"
        )
        JobListing.objects.create(
            source=source,
            external_id="1",
            title="Software Engineer",
            url="https://example.com/1",
            status="active",
        )
        JobListing.objects.create(
            source=source,
            external_id="2",
            title="Software Engineer",
            url="https://example.com/2",
            status="expired",
        )

        expression = {
            "field": "title",
            "operator": "contains",
            "value": "engineer",
        }

        client = Client()
        response = client.get(
            "/api/jobs/",
            {"status": "active", "filter": json.dumps(expression)},
        )

        assert response.status_code == 200
        data = response.json()["results"]
        assert len(data) == 1
        assert data[0]["status"] == "active"

    def test_filter_expression_returns_400_on_invalid_payload(self):
        expression = {"field": "title", "operator": "in", "value": "engineer"}

        client = Client()
        response = client.get("/api/jobs/", {"filter": json.dumps(expression)})

        assert response.status_code == 400
        assert "error" in response.json()

    def test_list_jobs_includes_seen_field_for_anonymous_user(self):
        self._create_source_with_listings()

        client = Client()
        response = client.get("/api/jobs/")

        assert response.status_code == 200
        data = response.json()["results"]
        assert all(job["seen"] is False for job in data)

    def test_list_jobs_includes_seen_status_for_authenticated_user(self):
        source = Source.objects.create(
            name="Seen Co", platform="greenhouse", board_id="seen-co"
        )
        seen_listing = JobListing.objects.create(
            source=source,
            external_id="seen-1",
            title="Seen Job",
            url="https://example.com/seen-1",
        )
        unseen_listing = JobListing.objects.create(
            source=source,
            external_id="seen-2",
            title="Unseen Job",
            url="https://example.com/seen-2",
        )
        client, user = self._authenticated_client(username="jobs-api-seen-user")
        SeenListing.objects.create(user=user, listing=seen_listing)

        response = client.get("/api/jobs/")

        assert response.status_code == 200
        data = response.json()["results"]
        data_by_id = {job["id"]: job for job in data}
        assert data_by_id[seen_listing.id]["seen"] is True
        assert data_by_id[unseen_listing.id]["seen"] is False

    def test_mark_listing_seen_requires_authentication(self):
        source = Source.objects.create(
            name="Seen Co", platform="greenhouse", board_id="seen-auth"
        )
        listing = JobListing.objects.create(
            source=source,
            external_id="mark-1",
            title="Mark Me",
            url="https://example.com/mark-1",
        )

        client = Client()
        response = client.post(f"/api/jobs/{listing.id}/seen/")

        assert response.status_code == 302

    def test_mark_listing_seen_is_idempotent(self):
        source = Source.objects.create(
            name="Seen Co", platform="greenhouse", board_id="seen-idempotent"
        )
        listing = JobListing.objects.create(
            source=source,
            external_id="mark-2",
            title="Mark Once",
            url="https://example.com/mark-2",
        )
        client, user = self._authenticated_client(username="jobs-api-mark-user")

        first_response = client.post(f"/api/jobs/{listing.id}/seen/")
        second_response = client.post(f"/api/jobs/{listing.id}/seen/")

        assert first_response.status_code == 201
        assert second_response.status_code == 200
        assert SeenListing.objects.filter(user=user, listing=listing).count() == 1


@pytest.mark.django_db
class TestLocationsAPI:
    def test_list_locations(self):
        LocationTag.objects.create(
            name="Toronto, ON", country_code="CA", region_code="CA-ON", city="Toronto"
        )
        LocationTag.objects.create(name="Unknown Place")
        client = Client()
        response = client.get("/api/locations/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        toronto = next(loc for loc in data if loc["name"] == "Toronto, ON")
        assert toronto["country_code"] == "CA"
        assert toronto["region_code"] == "CA-ON"
        assert toronto["city"] == "Toronto"
        assert toronto["geo_key"] == "CA-ON-Toronto"
        unknown = next(loc for loc in data if loc["name"] == "Unknown Place")
        assert unknown["country_code"] is None
        assert unknown["geo_key"] is None

    def test_empty_locations(self):
        client = Client()
        response = client.get("/api/locations/")
        assert response.status_code == 200
        assert response.json() == []


@pytest.mark.django_db
class TestRunsAPI:
    def test_list_runs_ordered_by_created_at_desc(self):
        Run.objects.create(status="completed")
        Run.objects.create(status="pending")
        client = Client()
        response = client.get("/api/runs/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["id"] > data[1]["id"]

    def test_list_runs_no_auth_required(self):
        client = Client()
        response = client.get("/api/runs/")
        assert response.status_code == 200

    @override_settings(INGEST_API_KEY="test-secret-key")
    @patch("core.views.ingest_sources")
    @patch("core.views._spawn_run", side_effect=_run_inline)
    def test_post_triggers_ingestion(self, mock_spawn, mock_ingest):
        Source.objects.create(name="Airbnb", platform="greenhouse", board_id="airbnb-run")
        mock_ingest.return_value = {
            "sources_processed": 1,
            "listings_created": 5,
            "listings_updated": 0,
            "listings_expired": 0,
            "errors": [],
        }
        client = Client()
        response = client.post(
            "/api/runs/",
            content_type="application/json",
            HTTP_AUTHORIZATION="Bearer test-secret-key",
        )
        assert response.status_code == 202
        data = response.json()
        assert data["status"] == "running"
        run = Run.objects.get(id=data["id"])
        assert run.status == "completed"
        assert run.listings_created == 5
        mock_ingest.assert_called_once()
        mock_spawn.assert_called_once_with(data["id"])

    @override_settings(INGEST_API_KEY="test-secret-key")
    @patch("core.views.ingest_sources")
    @patch("core.views._spawn_run", side_effect=_run_inline)
    def test_post_failed_run(self, mock_spawn, mock_ingest):
        mock_ingest.return_value = {
            "sources_processed": 0,
            "listings_created": 0,
            "listings_updated": 0,
            "listings_expired": 0,
            "errors": ["Source1: Connection error"],
        }
        client = Client()
        response = client.post(
            "/api/runs/",
            content_type="application/json",
            HTTP_AUTHORIZATION="Bearer test-secret-key",
        )
        assert response.status_code == 202
        data = response.json()
        assert data["status"] == "running"
        run = Run.objects.get(id=data["id"])
        assert run.status == "failed"
        assert "Source1" in run.error_message

    @override_settings(INGEST_API_KEY="test-secret-key")
    def test_post_missing_api_key(self):
        client = Client()
        response = client.post("/api/runs/", content_type="application/json")
        assert response.status_code == 401

    @override_settings(INGEST_API_KEY="test-secret-key")
    def test_post_invalid_api_key(self):
        client = Client()
        response = client.post(
            "/api/runs/",
            content_type="application/json",
            HTTP_AUTHORIZATION="Bearer wrong-key",
        )
        assert response.status_code == 401

    @override_settings(INGEST_API_KEY="test-secret-key")
    @patch("core.views.ingest_sources")
    @patch("core.views._spawn_run", side_effect=_run_inline)
    def test_post_unhandled_exception_records_failed_run(self, mock_spawn, mock_ingest):
        mock_ingest.side_effect = Exception("database exploded")
        client = Client()
        response = client.post(
            "/api/runs/",
            content_type="application/json",
            HTTP_AUTHORIZATION="Bearer test-secret-key",
        )
        assert response.status_code == 202
        data = response.json()
        run = Run.objects.get(id=data["id"])
        assert run.status == "failed"
        assert "database exploded" in run.error_message
        assert run.finished_at is not None

    @override_settings(INGEST_API_KEY="test-secret-key")
    @patch("core.views.ingest_sources")
    @patch("core.views._spawn_run", side_effect=_run_inline)
    def test_trigger_run_marks_stale_running_runs_as_failed(self, mock_spawn, mock_ingest):
        stale = Run.objects.create(status="running", started_at=timezone.now())
        mock_ingest.return_value = {
            "sources_processed": 1,
            "listings_created": 0,
            "listings_updated": 0,
            "listings_expired": 0,
            "errors": [],
        }
        client = Client()
        client.post(
            "/api/runs/",
            content_type="application/json",
            HTTP_AUTHORIZATION="Bearer test-secret-key",
        )
        stale.refresh_from_db()
        assert stale.status == "failed"
        assert stale.error_message == "Marked as failed: stale running state"

    @override_settings(INGEST_API_KEY="test-secret-key")
    @patch("core.views.ingest_sources")
    @patch("core.views._spawn_run")
    def test_post_returns_202_without_running_ingestion_inline(
        self, mock_spawn, mock_ingest
    ):
        """POST returns immediately with status=running; ingestion is deferred
        to the background worker so Cloudflare's 100s edge timeout can't kill
        an otherwise-successful scrape."""
        client = Client()
        response = client.post(
            "/api/runs/",
            content_type="application/json",
            HTTP_AUTHORIZATION="Bearer test-secret-key",
        )
        assert response.status_code == 202
        data = response.json()
        assert data["status"] == "running"
        assert data["finished_at"] is None
        assert data["listings_created"] == 0
        assert data["error_message"] is None
        mock_ingest.assert_not_called()
        mock_spawn.assert_called_once_with(data["id"])

    @patch("core.views.threading.Thread")
    def test_spawn_run_starts_daemon_thread_targeting_execute_run(self, mock_thread):
        from core.views import _execute_run, _spawn_run

        _spawn_run(42)
        mock_thread.assert_called_once_with(
            target=_execute_run, args=(42,), daemon=True
        )
        mock_thread.return_value.start.assert_called_once()


@pytest.mark.django_db
class TestSavedViewsAPI:
    def _authenticated_client(self, username="views-api-user"):
        user = get_user_model().objects.create_user(
            username=username, password="safe-test-password-123"
        )
        client = Client()
        client.force_login(user)
        return client, user

    def _view_payload(self, **overrides):
        defaults = {
            "name": "US Remote",
            "columns": [{"field": "title", "visible": True}],
            "sort": [{"field": "first_seen_at", "dir": "desc"}],
        }
        defaults.update(overrides)
        return defaults

    def test_list_views_requires_auth(self):
        client = Client()
        response = client.get("/api/views/")
        assert response.status_code == 302

    def test_list_views_returns_empty(self):
        client, _ = self._authenticated_client("views-empty")
        response = client.get("/api/views/")
        assert response.status_code == 200
        assert response.json() == []

    def test_list_views_returns_only_own_views(self):
        c1, u1 = self._authenticated_client("views-owner")
        c2, u2 = self._authenticated_client("views-other")
        SavedView.objects.create(user=u1, name="Mine", columns=[], sort=[])
        SavedView.objects.create(user=u2, name="Theirs", columns=[], sort=[])

        response = c1.get("/api/views/")
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Mine"

    def test_create_view(self):
        client, user = self._authenticated_client("views-create")
        payload = self._view_payload(
            filter_expression={"field": "title", "operator": "contains", "value": "eng"}
        )
        response = client.post(
            "/api/views/",
            json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "US Remote"
        assert data["filter_expression"] == payload["filter_expression"]
        assert data["columns"] == payload["columns"]
        assert data["sort"] == payload["sort"]
        assert data["config"] == {}
        assert "id" in data
        assert "created_at" in data

    def test_create_view_null_filter_expression(self):
        client, _ = self._authenticated_client("views-null-filter")
        payload = self._view_payload()
        response = client.post(
            "/api/views/",
            json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.json()["filter_expression"] is None

    def test_create_view_invalid_json(self):
        client, _ = self._authenticated_client("views-bad-json")
        response = client.post(
            "/api/views/", "not json", content_type="application/json"
        )
        assert response.status_code == 400

    def test_create_view_name_required(self):
        client, _ = self._authenticated_client("views-no-name")
        payload = self._view_payload(name="")
        response = client.post(
            "/api/views/",
            json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 400
        assert "name" in response.json()["error"]

    def test_create_view_columns_required(self):
        client, _ = self._authenticated_client("views-no-cols")
        payload = self._view_payload()
        del payload["columns"]
        response = client.post(
            "/api/views/",
            json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 400
        assert "columns" in response.json()["error"]

    def test_create_view_sort_required(self):
        client, _ = self._authenticated_client("views-no-sort")
        payload = self._view_payload()
        del payload["sort"]
        response = client.post(
            "/api/views/",
            json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 400
        assert "sort" in response.json()["error"]

    def test_create_view_invalid_filter_expression(self):
        client, _ = self._authenticated_client("views-bad-filter")
        payload = self._view_payload(
            filter_expression={"field": "title", "operator": "in", "value": "not-a-list"}
        )
        response = client.post(
            "/api/views/",
            json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 400
        assert "filter_expression" in response.json()["error"]

    def test_create_view_duplicate_name_returns_409(self):
        client, user = self._authenticated_client("views-dupe")
        SavedView.objects.create(user=user, name="Taken", columns=[], sort=[])
        payload = self._view_payload(name="Taken")
        response = client.post(
            "/api/views/",
            json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 409

    def test_get_view(self):
        client, user = self._authenticated_client("views-get")
        view = SavedView.objects.create(
            user=user, name="Detail", columns=[{"field": "title"}], sort=[]
        )
        response = client.get(f"/api/views/{view.id}/")
        assert response.status_code == 200
        assert response.json()["name"] == "Detail"

    def test_get_view_404_for_other_user(self):
        _, u1 = self._authenticated_client("views-get-owner")
        c2, _ = self._authenticated_client("views-get-other")
        view = SavedView.objects.create(user=u1, name="Private", columns=[], sort=[])
        response = c2.get(f"/api/views/{view.id}/")
        assert response.status_code == 404

    def test_update_view(self):
        client, user = self._authenticated_client("views-update")
        view = SavedView.objects.create(
            user=user, name="Old", columns=[], sort=[]
        )
        payload = self._view_payload(name="New")
        response = client.put(
            f"/api/views/{view.id}/",
            json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New"
        assert data["columns"] == payload["columns"]
        view.refresh_from_db()
        assert view.name == "New"

    def test_update_view_404_for_other_user(self):
        _, u1 = self._authenticated_client("views-put-owner")
        c2, _ = self._authenticated_client("views-put-other")
        view = SavedView.objects.create(user=u1, name="Private", columns=[], sort=[])
        payload = self._view_payload(name="Hacked")
        response = c2.put(
            f"/api/views/{view.id}/",
            json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_update_view_invalid_json(self):
        client, user = self._authenticated_client("views-put-bad")
        view = SavedView.objects.create(user=user, name="Test", columns=[], sort=[])
        response = client.put(
            f"/api/views/{view.id}/", "bad", content_type="application/json"
        )
        assert response.status_code == 400

    def test_update_view_validates_name(self):
        client, user = self._authenticated_client("views-put-validate")
        view = SavedView.objects.create(user=user, name="Test", columns=[], sort=[])
        response = client.put(
            f"/api/views/{view.id}/",
            json.dumps({"name": "", "columns": [], "sort": []}),
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_update_view_validates_columns(self):
        client, user = self._authenticated_client("views-put-cols")
        view = SavedView.objects.create(user=user, name="Test", columns=[], sort=[])
        response = client.put(
            f"/api/views/{view.id}/",
            json.dumps({"name": "X", "columns": "bad", "sort": []}),
            content_type="application/json",
        )
        assert response.status_code == 400
        assert "columns" in response.json()["error"]

    def test_update_view_validates_sort(self):
        client, user = self._authenticated_client("views-put-sort")
        view = SavedView.objects.create(user=user, name="Test", columns=[], sort=[])
        response = client.put(
            f"/api/views/{view.id}/",
            json.dumps({"name": "X", "columns": [], "sort": "bad"}),
            content_type="application/json",
        )
        assert response.status_code == 400
        assert "sort" in response.json()["error"]

    def test_update_view_validates_filter_expression(self):
        client, user = self._authenticated_client("views-put-filter")
        view = SavedView.objects.create(user=user, name="Test", columns=[], sort=[])
        response = client.put(
            f"/api/views/{view.id}/",
            json.dumps({
                "name": "X",
                "columns": [],
                "sort": [],
                "filter_expression": {"field": "title", "operator": "in", "value": "bad"},
            }),
            content_type="application/json",
        )
        assert response.status_code == 400
        assert "filter_expression" in response.json()["error"]

    def test_delete_view(self):
        client, user = self._authenticated_client("views-delete")
        view = SavedView.objects.create(user=user, name="Gone", columns=[], sort=[])
        response = client.delete(f"/api/views/{view.id}/")
        assert response.status_code == 204
        assert not SavedView.objects.filter(id=view.id).exists()

    def test_delete_view_404_for_other_user(self):
        _, u1 = self._authenticated_client("views-del-owner")
        c2, _ = self._authenticated_client("views-del-other")
        view = SavedView.objects.create(user=u1, name="Private", columns=[], sort=[])
        response = c2.delete(f"/api/views/{view.id}/")
        assert response.status_code == 404

    def test_create_requires_auth(self):
        client = Client()
        response = client.post(
            "/api/views/",
            json.dumps({"name": "x", "columns": [], "sort": []}),
            content_type="application/json",
        )
        assert response.status_code == 302


@pytest.mark.django_db
class TestCSRFEnforcement:
    """Once @csrf_exempt is removed, unsafe methods without a valid CSRF
    token must be rejected with 403. The SPA flows CSRF via the
    `csrftoken` cookie + `X-CSRFToken` header (see frontend/src/lib/csrf.ts
    and fetcher.ts). The legacy GitHub Actions cron endpoint keeps
    @csrf_exempt because it Bearer-authenticates — see TestCSRFRunsExempt
    below."""

    def _logged_in_csrf_client(self, username):
        user = get_user_model().objects.create_user(
            username=username, password="safe-test-password-123"
        )
        client = Client(enforce_csrf_checks=True)
        client.force_login(user)
        return client, user

    def _seed_listing(self):
        source = Source.objects.create(
            name="CSRF Co", platform="greenhouse", board_id="csrf-board"
        )
        return JobListing.objects.create(
            source=source,
            external_id="csrf-1",
            title="CSRF Job",
            url="https://example.com/csrf-1",
        )

    def test_mark_listing_seen_rejects_post_without_csrf_token(self):
        listing = self._seed_listing()
        client, _ = self._logged_in_csrf_client("csrf-mark-no-token")
        response = client.post(f"/api/jobs/{listing.id}/seen/")
        assert response.status_code == 403

    def test_mark_listing_seen_accepts_post_with_csrf_token(self):
        listing = self._seed_listing()
        client, _ = self._logged_in_csrf_client("csrf-mark-with-token")
        # Seed the CSRF cookie by visiting any @ensure_csrf_cookie view.
        client.get("/")  # spa_index (login_required redirects but sets cookie path)
        # Force a fresh cookie via the dedicated SPA index, which does set
        # the csrftoken cookie for authenticated users.
        client.get("/runs/")
        token = client.cookies["csrftoken"].value
        response = client.post(
            f"/api/jobs/{listing.id}/seen/",
            HTTP_X_CSRFTOKEN=token,
        )
        assert response.status_code == 201

    def test_saved_views_list_rejects_post_without_csrf_token(self):
        client, _ = self._logged_in_csrf_client("csrf-views-no-token")
        response = client.post(
            "/api/views/",
            json.dumps({"name": "x", "columns": [], "sort": []}),
            content_type="application/json",
        )
        assert response.status_code == 403

    def test_saved_views_list_accepts_post_with_csrf_token(self):
        client, _ = self._logged_in_csrf_client("csrf-views-with-token")
        client.get("/runs/")
        token = client.cookies["csrftoken"].value
        response = client.post(
            "/api/views/",
            json.dumps(
                {
                    "name": "CSRF view",
                    "columns": [{"field": "title", "visible": True}],
                    "sort": [{"field": "first_seen_at", "dir": "desc"}],
                }
            ),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=token,
        )
        assert response.status_code == 201

    def test_saved_view_detail_rejects_put_without_csrf_token(self):
        client, user = self._logged_in_csrf_client("csrf-detail-put-no-token")
        view = SavedView.objects.create(
            user=user, name="x", columns=[], sort=[]
        )
        response = client.put(
            f"/api/views/{view.id}/",
            json.dumps({"name": "x", "columns": [], "sort": []}),
            content_type="application/json",
        )
        assert response.status_code == 403

    def test_saved_view_detail_rejects_delete_without_csrf_token(self):
        client, user = self._logged_in_csrf_client("csrf-detail-del-no-token")
        view = SavedView.objects.create(
            user=user, name="x", columns=[], sort=[]
        )
        response = client.delete(f"/api/views/{view.id}/")
        assert response.status_code == 403

    def test_saved_view_detail_accepts_delete_with_csrf_token(self):
        client, user = self._logged_in_csrf_client("csrf-detail-del-with-token")
        view = SavedView.objects.create(
            user=user, name="x", columns=[], sort=[]
        )
        client.get("/runs/")
        token = client.cookies["csrftoken"].value
        response = client.delete(
            f"/api/views/{view.id}/",
            HTTP_X_CSRFTOKEN=token,
        )
        assert response.status_code == 204


@pytest.mark.django_db
class TestCSRFRunsExempt:
    """`POST /api/runs/` is intentionally CSRF-exempt because it is called by
    GitHub Actions with Bearer auth — no browser session, no CSRF cookie. The
    GET path is safe-method by default; CsrfViewMiddleware does not check
    safe methods so no special handling is needed there."""

    @override_settings(INGEST_API_KEY="test-secret-key")
    def test_post_runs_without_csrf_token_succeeds_with_valid_bearer(self):
        client = Client(enforce_csrf_checks=True)
        with patch("core.views._spawn_run"):
            response = client.post(
                "/api/runs/",
                HTTP_AUTHORIZATION="Bearer test-secret-key",
            )
        assert response.status_code == 202

    def test_post_runs_without_csrf_token_rejects_missing_bearer(self):
        client = Client(enforce_csrf_checks=True)
        response = client.post("/api/runs/")
        assert response.status_code == 401


@pytest.mark.django_db
class TestJobsFacetsAPI:
    """`GET /api/jobs/facets/` returns distinct values per requested field
    across the entire JobListing table, regardless of pagination."""

    def _populate(self):
        acme = Source.objects.create(
            name="Acme", platform="greenhouse", board_id="acme"
        )
        globex = Source.objects.create(
            name="Globex", platform="lever", board_id="globex"
        )
        ca = LocationTag.objects.create(
            name="Toronto", country_code="CA", region_code="CA-ON", city="Toronto"
        )
        us = LocationTag.objects.create(
            name="SF", country_code="US", region_code="US-CA", city="San Francisco"
        )
        listing1 = JobListing.objects.create(
            source=acme,
            external_id="a1",
            title="Engineer",
            url="https://example.com/a1",
            status="active",
            employment_type="full_time",
            workplace_type="remote",
        )
        listing2 = JobListing.objects.create(
            source=globex,
            external_id="g1",
            title="Designer",
            url="https://example.com/g1",
            status="expired",
            employment_type="part_time",
            workplace_type="on_site",
        )
        listing3 = JobListing.objects.create(
            source=acme,
            external_id="a2",
            title="Manager",
            url="https://example.com/a2",
            status="active",
            employment_type="full_time",
            workplace_type="hybrid",
        )
        listing1.locations.add(ca)
        listing2.locations.add(us)
        listing3.locations.add(ca, us)

    def test_facets_returns_distinct_source_names(self):
        self._populate()
        client = Client()
        response = client.get("/api/jobs/facets/?fields=source_name")
        assert response.status_code == 200
        data = response.json()
        assert data == {"source_name": ["Acme", "Globex"]}

    def test_facets_returns_distinct_country_region_city(self):
        self._populate()
        client = Client()
        response = client.get(
            "/api/jobs/facets/?fields=country,region,city"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["country"] == ["CA", "US"]
        assert data["region"] == ["CA-ON", "US-CA"]
        assert data["city"] == ["San Francisco", "Toronto"]

    def test_facets_returns_distinct_enum_columns(self):
        self._populate()
        client = Client()
        response = client.get(
            "/api/jobs/facets/?fields=status,employment_type,workplace_type"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == ["active", "expired"]
        assert data["employment_type"] == ["full_time", "part_time"]
        assert data["workplace_type"] == ["hybrid", "on_site", "remote"]

    def test_facets_omits_empty_or_null_values(self):
        source = Source.objects.create(
            name="Empty", platform="greenhouse", board_id="empty"
        )
        JobListing.objects.create(
            source=source,
            external_id="e1",
            title="No fields",
            url="https://example.com/e1",
            employment_type="",
            workplace_type="",
        )
        client = Client()
        response = client.get(
            "/api/jobs/facets/?fields=employment_type,workplace_type,country"
        )
        data = response.json()
        assert data == {
            "employment_type": [],
            "workplace_type": [],
            "country": [],
        }

    def test_facets_rejects_unknown_field(self):
        client = Client()
        response = client.get("/api/jobs/facets/?fields=bogus")
        assert response.status_code == 400
        assert "bogus" in response.json()["error"]

    def test_facets_requires_fields_parameter(self):
        client = Client()
        response = client.get("/api/jobs/facets/")
        assert response.status_code == 400
        assert "fields" in response.json()["error"]

    def test_facets_ignores_empty_field_tokens(self):
        self._populate()
        client = Client()
        response = client.get(
            "/api/jobs/facets/?fields=,source_name,,"
        )
        assert response.status_code == 200
        assert response.json() == {"source_name": ["Acme", "Globex"]}

    def test_facets_returns_each_requested_field_even_when_duplicated(self):
        self._populate()
        client = Client()
        response = client.get(
            "/api/jobs/facets/?fields=source_name,source_name"
        )
        assert response.status_code == 200
        # Duplicates collapse to a single key in the response dict; values are stable.
        assert response.json() == {"source_name": ["Acme", "Globex"]}
