from unittest.mock import patch, Mock

import pytest

from core.ingestion import ingest_sources
from core.models import JobListing, LocationTag, Source


@pytest.mark.django_db
class TestIngestSources:
    def _create_source(self, name="Airbnb", platform="greenhouse", board_id="airbnb"):
        return Source.objects.create(name=name, platform=platform, board_id=board_id)

    def _make_item(self, **overrides):
        defaults = {
            "external_id": "1",
            "title": "Engineer",
            "department": "Eng",
            "locations": ["SF"],
            "url": "https://example.com/1",
            "team": None,
            "employment_type": "unknown",
            "workplace_type": "unknown",
            "country": None,
            "published_at": None,
            "updated_at_source": None,
            "is_listed": None,
        }
        defaults.update(overrides)
        return defaults

    @patch("core.ingestion.get_adapter")
    def test_creates_new_listings(self, mock_get_adapter):
        source = self._create_source()
        adapter = Mock()
        adapter.fetch_listings.return_value = [
            self._make_item(external_id="1", title="Engineer", locations=["SF"]),
            self._make_item(external_id="2", title="Designer", locations=["NYC"]),
        ]
        mock_get_adapter.return_value = adapter

        result = ingest_sources(Source.objects.filter(pk=source.pk))
        assert result["sources_processed"] == 1
        assert result["listings_created"] == 2
        assert result["listings_updated"] == 0
        assert result["listings_expired"] == 0
        assert result["errors"] == []
        assert JobListing.objects.count() == 2

    @patch("core.ingestion.get_adapter")
    def test_updates_existing_listings(self, mock_get_adapter):
        source = self._create_source()
        JobListing.objects.create(
            source=source,
            external_id="1",
            title="Old Title",
            url="https://example.com/1",
        )
        adapter = Mock()
        adapter.fetch_listings.return_value = [
            self._make_item(
                external_id="1",
                title="New Title",
                url="https://example.com/1-updated",
                team="Platform",
                employment_type="full_time",
            ),
        ]
        mock_get_adapter.return_value = adapter

        result = ingest_sources(Source.objects.filter(pk=source.pk))
        assert result["listings_created"] == 0
        assert result["listings_updated"] == 1
        listing = JobListing.objects.get(source=source, external_id="1")
        assert listing.title == "New Title"
        assert listing.url == "https://example.com/1-updated"
        assert listing.team == "Platform"
        assert listing.employment_type == "full_time"

    @patch("core.ingestion.get_adapter")
    def test_marks_missing_listings_expired(self, mock_get_adapter):
        source = self._create_source()
        JobListing.objects.create(
            source=source,
            external_id="1",
            title="Gone Job",
            url="https://example.com/1",
            status="active",
        )
        adapter = Mock()
        adapter.fetch_listings.return_value = []
        mock_get_adapter.return_value = adapter

        result = ingest_sources(Source.objects.filter(pk=source.pk))
        assert result["listings_expired"] == 1
        listing = JobListing.objects.get(source=source, external_id="1")
        assert listing.status == "expired"
        assert listing.expired_at is not None

    @patch("core.ingestion.get_adapter")
    def test_already_expired_stays_expired(self, mock_get_adapter):
        source = self._create_source()
        JobListing.objects.create(
            source=source,
            external_id="1",
            title="Old Job",
            url="https://example.com/1",
            status="expired",
        )
        adapter = Mock()
        adapter.fetch_listings.return_value = []
        mock_get_adapter.return_value = adapter

        result = ingest_sources(Source.objects.filter(pk=source.pk))
        assert result["listings_expired"] == 0

    @patch("core.ingestion.get_adapter")
    def test_continues_on_source_failure(self, mock_get_adapter):
        source1 = self._create_source(name="Good", board_id="good")
        source2 = self._create_source(
            name="Bad", platform="lever", board_id="bad"
        )
        source3 = self._create_source(
            name="Also Good", platform="ashby", board_id="alsogood"
        )

        def side_effect(platform):
            adapter = Mock()
            if platform == "lever":
                adapter.fetch_listings.side_effect = Exception("API down")
            else:
                adapter.fetch_listings.return_value = [
                    self._make_item(external_id="1", locations=[]),
                ]
            return adapter

        mock_get_adapter.side_effect = side_effect

        sources = Source.objects.filter(
            pk__in=[source1.pk, source2.pk, source3.pk]
        )
        result = ingest_sources(sources)
        assert result["sources_processed"] == 2
        assert result["listings_created"] == 2
        assert len(result["errors"]) == 1
        assert "Bad" in result["errors"][0]

    @patch("core.ingestion.get_adapter")
    def test_unlisted_job_marked_expired(self, mock_get_adapter):
        source = self._create_source()
        adapter = Mock()
        adapter.fetch_listings.return_value = [
            self._make_item(external_id="1", is_listed=False),
        ]
        mock_get_adapter.return_value = adapter

        result = ingest_sources(Source.objects.filter(pk=source.pk))
        assert result["listings_created"] == 1
        assert result["listings_expired"] == 1
        listing = JobListing.objects.get(source=source, external_id="1")
        assert listing.status == "expired"
        assert listing.expired_at is not None

    @patch("core.ingestion.get_adapter")
    def test_is_listed_none_does_not_expire(self, mock_get_adapter):
        source = self._create_source()
        adapter = Mock()
        adapter.fetch_listings.return_value = [
            self._make_item(external_id="1", is_listed=None),
        ]
        mock_get_adapter.return_value = adapter

        result = ingest_sources(Source.objects.filter(pk=source.pk))
        assert result["listings_expired"] == 0
        listing = JobListing.objects.get(source=source, external_id="1")
        assert listing.status == "active"
        assert listing.expired_at is None

    @patch("core.ingestion.get_adapter")
    def test_creates_location_tags(self, mock_get_adapter):
        source = self._create_source()
        adapter = Mock()
        adapter.fetch_listings.return_value = [
            self._make_item(external_id="1", locations=["Toronto", "New York"]),
        ]
        mock_get_adapter.return_value = adapter

        ingest_sources(Source.objects.filter(pk=source.pk))
        listing = JobListing.objects.get(source=source, external_id="1")
        location_names = list(listing.locations.values_list("name", flat=True))
        assert sorted(location_names) == ["New York", "Toronto"]
        assert LocationTag.objects.count() == 2

    @patch("core.ingestion.get_adapter")
    def test_deduplicates_location_tags(self, mock_get_adapter):
        source = self._create_source()
        adapter = Mock()
        adapter.fetch_listings.return_value = [
            self._make_item(external_id="1", locations=["Toronto"]),
            self._make_item(external_id="2", title="Designer", locations=["Toronto"]),
        ]
        mock_get_adapter.return_value = adapter

        ingest_sources(Source.objects.filter(pk=source.pk))
        assert LocationTag.objects.count() == 1
        assert LocationTag.objects.first().name == "Toronto"

    @patch("core.ingestion.get_adapter")
    def test_persists_enriched_fields(self, mock_get_adapter):
        source = self._create_source(platform="lever", board_id="spotify")
        adapter = Mock()
        adapter.fetch_listings.return_value = [
            self._make_item(
                external_id="abc",
                team="Platform",
                employment_type="full_time",
                workplace_type="hybrid",
                country="CA",
                published_at="2026-01-15T10:00:00+00:00",
            ),
        ]
        mock_get_adapter.return_value = adapter

        ingest_sources(Source.objects.filter(pk=source.pk))
        listing = JobListing.objects.get(source=source, external_id="abc")
        assert listing.team == "Platform"
        assert listing.employment_type == "full_time"
        assert listing.workplace_type == "hybrid"
        assert listing.country == "CA"
        assert listing.published_at is not None
