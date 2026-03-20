import json
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.test import Client, override_settings

from core.models import JobListing, LocationTag, Run, SeenListing, Source


@pytest.mark.django_db
def test_health_returns_200_with_status_ok():
    client = Client()
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.django_db
class TestSourcesAPI:
    def test_list_sources(self):
        Source.objects.create(name="Airbnb", platform="greenhouse", board_id="airbnb")
        Source.objects.create(name="Stripe", platform="lever", board_id="stripe")
        client = Client()
        response = client.get("/api/sources/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["name"] == "Airbnb"
        assert data[0]["platform"] == "greenhouse"
        assert data[0]["board_id"] == "airbnb"
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
            name="Airbnb", platform="greenhouse", board_id="airbnb"
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
        data = response.json()
        assert len(data) == 2
        assert "source_name" in data[0]
        assert "source_id" in data[0]
        assert "external_id" in data[0]

    def test_includes_enriched_fields(self):
        self._create_source_with_listings()
        client = Client()
        response = client.get("/api/jobs/")
        data = response.json()
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
        data = response.json()
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
        data = response.json()
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
        data = response.json()
        assert len(data) == 2
        assert all(j["source_id"] == source.pk for j in data)

    def test_filter_by_status(self):
        self._create_source_with_listings()
        client = Client()
        response = client.get("/api/jobs/?status=active")
        assert response.status_code == 200
        data = response.json()
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
        data = response.json()
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
        data = response.json()
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
        data = response.json()
        assert [row["title"] for row in data] == ["US Job"]

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
        data = response.json()
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
        data = response.json()
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
        data = response.json()
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
    def test_post_triggers_ingestion(self, mock_ingest):
        Source.objects.create(name="Airbnb", platform="greenhouse", board_id="airbnb")
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
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "completed"
        assert data["listings_created"] == 5
        mock_ingest.assert_called_once()

    @override_settings(INGEST_API_KEY="test-secret-key")
    @patch("core.views.ingest_sources")
    def test_post_failed_run(self, mock_ingest):
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
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "failed"
        assert "Source1" in data["error_message"]

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
