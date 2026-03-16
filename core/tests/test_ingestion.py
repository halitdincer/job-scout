from unittest.mock import patch, Mock

import pytest

from core.ingestion import ingest_sources
from core.models import JobListing, Source


@pytest.mark.django_db
class TestIngestSources:
    def _create_source(self, name="Airbnb", platform="greenhouse", board_id="airbnb"):
        return Source.objects.create(name=name, platform=platform, board_id=board_id)

    @patch("core.ingestion.get_adapter")
    def test_creates_new_listings(self, mock_get_adapter):
        source = self._create_source()
        adapter = Mock()
        adapter.fetch_listings.return_value = [
            {
                "external_id": "1",
                "title": "Engineer",
                "department": "Eng",
                "location": "SF",
                "url": "https://example.com/1",
            },
            {
                "external_id": "2",
                "title": "Designer",
                "department": "Design",
                "location": "NYC",
                "url": "https://example.com/2",
            },
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
            {
                "external_id": "1",
                "title": "New Title",
                "department": "Eng",
                "location": "SF",
                "url": "https://example.com/1-updated",
            },
        ]
        mock_get_adapter.return_value = adapter

        result = ingest_sources(Source.objects.filter(pk=source.pk))
        assert result["listings_created"] == 0
        assert result["listings_updated"] == 1
        listing = JobListing.objects.get(source=source, external_id="1")
        assert listing.title == "New Title"
        assert listing.url == "https://example.com/1-updated"

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
                    {
                        "external_id": "1",
                        "title": "Job",
                        "department": None,
                        "location": None,
                        "url": "https://example.com/1",
                    }
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
