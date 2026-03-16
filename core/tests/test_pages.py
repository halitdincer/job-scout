import pytest
from django.test import Client

from core.models import JobListing, Run, Source


@pytest.mark.django_db
class TestJobsPage:
    def _create_source_with_listings(self):
        source = Source.objects.create(
            name="Airbnb", platform="greenhouse", board_id="airbnb"
        )
        JobListing.objects.create(
            source=source,
            external_id="1",
            title="Software Engineer",
            department="Eng",
            location="SF",
            url="https://example.com/1",
            status="active",
        )
        JobListing.objects.create(
            source=source,
            external_id="2",
            title="Designer",
            url="https://example.com/2",
            status="expired",
        )
        return source

    def test_renders_jobs_template(self):
        client = Client()
        response = client.get("/")
        assert response.status_code == 200
        assert "core/jobs.html" in [t.name for t in response.templates]

    def test_context_has_listings_and_sources(self):
        self._create_source_with_listings()
        client = Client()
        response = client.get("/")
        assert len(response.context["listings"]) == 2
        assert len(response.context["sources"]) == 1

    def test_search_by_title(self):
        self._create_source_with_listings()
        client = Client()
        response = client.get("/?q=engineer")
        listings = list(response.context["listings"])
        assert len(listings) == 1
        assert listings[0].title == "Software Engineer"

    def test_filter_by_status(self):
        self._create_source_with_listings()
        client = Client()
        response = client.get("/?status=active")
        listings = list(response.context["listings"])
        assert len(listings) == 1
        assert listings[0].status == "active"

    def test_filter_by_source(self):
        source = self._create_source_with_listings()
        other = Source.objects.create(name="Other", platform="lever", board_id="other")
        JobListing.objects.create(
            source=other, external_id="99", title="Other Job", url="https://example.com/99"
        )
        client = Client()
        response = client.get(f"/?source={source.pk}")
        listings = list(response.context["listings"])
        assert len(listings) == 2
        assert all(j.source_id == source.pk for j in listings)

    def test_empty_state(self):
        client = Client()
        response = client.get("/")
        assert response.status_code == 200
        assert b"No job listings found." in response.content


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
