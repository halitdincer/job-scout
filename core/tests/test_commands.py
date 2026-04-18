from io import StringIO
from unittest.mock import patch

import pytest
from django.core.management import call_command

from core.models import LocationTag, Source


@pytest.mark.django_db
class TestIngestCommand:
    @patch("core.management.commands.ingest.ingest_sources")
    def test_ingests_all_active_sources(self, mock_ingest):
        Source.objects.all().delete()
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
        Source.objects.all().delete()
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


@pytest.mark.django_db
class TestBackfillGeoCommand:
    @patch("core.management.commands.backfill_geo.geocode_location")
    def test_backfills_unmapped_tag(self, mock_geocode):
        tag = LocationTag.objects.create(name="Toronto, ON")
        mock_geocode.return_value = {
            "country_code": "CA",
            "region_code": "CA-ON",
            "city": "Toronto",
        }
        out = StringIO()
        call_command("backfill_geo", stdout=out)
        tag.refresh_from_db()
        assert tag.country_code == "CA"
        assert tag.region_code == "CA-ON"
        assert tag.city == "Toronto"
        mock_geocode.assert_called_once_with("Toronto, ON")

    @patch("core.management.commands.backfill_geo.geocode_location")
    def test_skips_already_mapped_tag(self, mock_geocode):
        LocationTag.objects.create(
            name="Toronto, ON", country_code="CA", region_code="CA-ON", city="Toronto"
        )
        out = StringIO()
        call_command("backfill_geo", stdout=out)
        mock_geocode.assert_not_called()

    @patch("core.management.commands.backfill_geo.geocode_location")
    def test_unparseable_tag_stays_null(self, mock_geocode):
        tag = LocationTag.objects.create(name="Remote")
        mock_geocode.return_value = {
            "country_code": None,
            "region_code": None,
            "city": None,
        }
        out = StringIO()
        call_command("backfill_geo", stdout=out)
        tag.refresh_from_db()
        assert tag.country_code is None
        assert "skipped" in out.getvalue().lower() or "no result" in out.getvalue().lower()

    @patch("core.management.commands.backfill_geo.geocode_location")
    def test_dry_run_does_not_save(self, mock_geocode):
        tag = LocationTag.objects.create(name="Toronto, ON")
        mock_geocode.return_value = {
            "country_code": "CA",
            "region_code": "CA-ON",
            "city": "Toronto",
        }
        out = StringIO()
        call_command("backfill_geo", dry_run=True, stdout=out)
        tag.refresh_from_db()
        assert tag.country_code is None
        assert "dry run" in out.getvalue().lower() or "would set" in out.getvalue().lower()

    @patch("core.management.commands.backfill_geo.geocode_location")
    def test_outputs_summary(self, mock_geocode):
        LocationTag.objects.create(name="Toronto, ON")
        LocationTag.objects.create(name="Already", country_code="US")
        mock_geocode.return_value = {
            "country_code": "CA",
            "region_code": "CA-ON",
            "city": "Toronto",
        }
        out = StringIO()
        call_command("backfill_geo", stdout=out)
        output = out.getvalue()
        assert "1" in output  # 1 updated

    @patch("core.management.commands.backfill_geo.time.sleep")
    @patch("core.management.commands.backfill_geo.geocode_location")
    def test_rate_limits_between_multiple_unmapped_tags(self, mock_geocode, mock_sleep):
        LocationTag.objects.create(name="Toronto, ON")
        LocationTag.objects.create(name="Vancouver, BC")
        mock_geocode.side_effect = [
            {"country_code": "CA", "region_code": "CA-ON", "city": "Toronto"},
            {"country_code": "CA", "region_code": "CA-BC", "city": "Vancouver"},
        ]

        call_command("backfill_geo", stdout=StringIO())

        mock_sleep.assert_called_once_with(1)


@pytest.mark.django_db
class TestNormalizeLocationTagsCommand:
    def _create_listing_with_tag(self, tag_name):
        source = Source.objects.create(name="A", platform="greenhouse", board_id="a")
        listing = source.listings.create(
            external_id="1",
            title="Engineer",
            url="https://example.com/1",
        )
        tag = LocationTag.objects.create(name=tag_name)
        listing.locations.add(tag)
        return listing, tag

    def test_dry_run_reports_without_writing(self):
        listing, old_tag = self._create_listing_with_tag("Chicago / Remote")
        out = StringIO()

        call_command("normalize_location_tags", dry_run=True, stdout=out)

        listing.refresh_from_db()
        assert list(listing.locations.values_list("name", flat=True)) == [old_tag.name]
        assert not LocationTag.objects.filter(name="Chicago").exists()
        assert "dry run" in out.getvalue().lower()

    def test_relinks_to_normalized_tags(self):
        listing, old_tag = self._create_listing_with_tag("Chicago / Remote")

        call_command("normalize_location_tags", stdout=StringIO())

        listing.refresh_from_db()
        assert sorted(listing.locations.values_list("name", flat=True)) == [
            "Chicago",
            "Remote",
        ]
        old_tag.refresh_from_db()

    def test_delete_obsolete_flag_removes_unreferenced_old_tags(self):
        listing, old_tag = self._create_listing_with_tag("Chicago / Remote")

        call_command("normalize_location_tags", delete_obsolete=True, stdout=StringIO())

        listing.refresh_from_db()
        assert sorted(listing.locations.values_list("name", flat=True)) == [
            "Chicago",
            "Remote",
        ]
        assert not LocationTag.objects.filter(pk=old_tag.pk).exists()

    def test_extracts_location_from_serialized_dict_name(self):
        listing, old_tag = self._create_listing_with_tag("{'location': 'Austin', 'meta': 1}")

        call_command("normalize_location_tags", stdout=StringIO())

        listing.refresh_from_db()
        assert list(listing.locations.values_list("name", flat=True)) == ["Austin"]
        old_tag.refresh_from_db()

    def test_reports_skipped_for_unparseable_tag(self):
        self._create_listing_with_tag("{}")
        out = StringIO()

        call_command("normalize_location_tags", stdout=out)

        assert "skipped" in out.getvalue().lower()

    def test_tracks_unchanged_tags(self):
        self._create_listing_with_tag("Toronto")
        out = StringIO()

        call_command("normalize_location_tags", stdout=out)

        assert "unchanged 1" in out.getvalue().lower()

    def test_source_aware_stripe_comma_split_during_remediation(self):
        source = Source.objects.create(
            name="Stripe", platform="greenhouse", board_id="stripe"
        )
        listing = source.listings.create(
            external_id="1",
            title="Engineer",
            url="https://example.com/1",
        )
        tag = LocationTag.objects.create(name="SF, NYC, CHI")
        listing.locations.add(tag)

        call_command("normalize_location_tags", delete_obsolete=True, stdout=StringIO())

        listing.refresh_from_db()
        assert sorted(listing.locations.values_list("name", flat=True)) == [
            "CHI",
            "NYC",
            "SF",
        ]
        assert not LocationTag.objects.filter(pk=tag.pk).exists()

    def test_source_aware_pinterest_not_comma_split_during_remediation(self):
        source = Source.objects.create(
            name="Pinterest", platform="greenhouse", board_id="pinterest"
        )
        listing = source.listings.create(
            external_id="1",
            title="Engineer",
            url="https://example.com/1",
        )
        tag = LocationTag.objects.create(name="San Francisco, CA, US")
        listing.locations.add(tag)

        call_command("normalize_location_tags", stdout=StringIO())

        listing.refresh_from_db()
        assert list(listing.locations.values_list("name", flat=True)) == [
            "San Francisco, CA, US",
        ]

    def test_multi_source_tag_uses_stripe_profile_when_mixed(self):
        stripe_source = Source.objects.create(
            name="Stripe", platform="greenhouse", board_id="stripe"
        )
        other_source = Source.objects.create(
            name="Other", platform="lever", board_id="other"
        )
        stripe_listing = stripe_source.listings.create(
            external_id="1",
            title="Engineer",
            url="https://example.com/1",
        )
        other_listing = other_source.listings.create(
            external_id="2",
            title="Designer",
            url="https://example.com/2",
        )
        tag = LocationTag.objects.create(name="SF, NYC")
        stripe_listing.locations.add(tag)
        other_listing.locations.add(tag)

        call_command("normalize_location_tags", delete_obsolete=True, stdout=StringIO())

        stripe_listing.refresh_from_db()
        assert sorted(stripe_listing.locations.values_list("name", flat=True)) == [
            "NYC",
            "SF",
        ]
        other_listing.refresh_from_db()
        assert sorted(other_listing.locations.values_list("name", flat=True)) == [
            "NYC",
            "SF",
        ]

    def test_dry_run_source_aware_reports_stripe_splits(self):
        source = Source.objects.create(
            name="Stripe", platform="greenhouse", board_id="stripe"
        )
        listing = source.listings.create(
            external_id="1",
            title="Engineer",
            url="https://example.com/1",
        )
        tag = LocationTag.objects.create(name="SF, NYC")
        listing.locations.add(tag)
        out = StringIO()

        call_command("normalize_location_tags", dry_run=True, stdout=out)

        listing.refresh_from_db()
        assert list(listing.locations.values_list("name", flat=True)) == ["SF, NYC"]
        assert "dry run" in out.getvalue().lower()

    @patch("core.management.commands.backfill_geo.geocode_location")
    def test_remediation_generated_tags_are_backfillable(self, mock_geocode):
        self._create_listing_with_tag("Chicago / Remote")

        def geocode_side_effect(name):
            if name == "Chicago":
                return {
                    "country_code": "US",
                    "region_code": "US-IL",
                    "city": "Chicago",
                }
            return {
                "country_code": None,
                "region_code": None,
                "city": None,
            }

        mock_geocode.side_effect = geocode_side_effect

        call_command("normalize_location_tags", delete_obsolete=True, stdout=StringIO())
        call_command("backfill_geo", stdout=StringIO())

        chicago = LocationTag.objects.get(name="Chicago")
        assert chicago.country_code == "US"
        assert chicago.region_code == "US-IL"
        assert chicago.city == "Chicago"
