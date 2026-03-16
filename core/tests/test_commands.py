from io import StringIO
from unittest.mock import patch

import pytest
from django.core.management import call_command

from core.models import Source


@pytest.mark.django_db
class TestIngestCommand:
    @patch("core.management.commands.ingest.ingest_sources")
    def test_ingests_all_active_sources(self, mock_ingest):
        Source.objects.create(name="A", platform="greenhouse", board_id="a")
        Source.objects.create(name="B", platform="lever", board_id="b")
        mock_ingest.return_value = {
            "sources_processed": 2,
            "listings_created": 5,
            "listings_updated": 0,
            "listings_expired": 0,
            "errors": [],
        }
        out = StringIO()
        call_command("ingest", stdout=out)
        mock_ingest.assert_called_once()
        sources = list(mock_ingest.call_args[0][0])
        assert len(sources) == 2

    @patch("core.management.commands.ingest.ingest_sources")
    def test_skips_inactive_sources(self, mock_ingest):
        Source.objects.create(name="Active", platform="greenhouse", board_id="a")
        Source.objects.create(
            name="Inactive", platform="lever", board_id="b", is_active=False
        )
        mock_ingest.return_value = {
            "sources_processed": 1,
            "listings_created": 0,
            "listings_updated": 0,
            "listings_expired": 0,
            "errors": [],
        }
        call_command("ingest", stdout=StringIO())
        sources = list(mock_ingest.call_args[0][0])
        assert len(sources) == 1
        assert sources[0].name == "Active"

    @patch("core.management.commands.ingest.ingest_sources")
    def test_source_id_flag(self, mock_ingest):
        source = Source.objects.create(
            name="Target", platform="greenhouse", board_id="t"
        )
        Source.objects.create(name="Other", platform="lever", board_id="o")
        mock_ingest.return_value = {
            "sources_processed": 1,
            "listings_created": 0,
            "listings_updated": 0,
            "listings_expired": 0,
            "errors": [],
        }
        call_command("ingest", source_id=source.pk, stdout=StringIO())
        sources = list(mock_ingest.call_args[0][0])
        assert len(sources) == 1
        assert sources[0].pk == source.pk

    @patch("core.management.commands.ingest.ingest_sources")
    def test_outputs_errors(self, mock_ingest):
        Source.objects.create(name="A", platform="greenhouse", board_id="a")
        mock_ingest.return_value = {
            "sources_processed": 0,
            "listings_created": 0,
            "listings_updated": 0,
            "listings_expired": 0,
            "errors": ["A: Connection refused"],
        }
        err = StringIO()
        call_command("ingest", stderr=err, stdout=StringIO())
        assert "Connection refused" in err.getvalue()

    def test_source_not_found(self):
        out = StringIO()
        err = StringIO()
        call_command("ingest", source_id=999, stdout=out, stderr=err)
        assert "not found" in err.getvalue().lower()
