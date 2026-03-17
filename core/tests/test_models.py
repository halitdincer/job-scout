import pytest
from django.db import IntegrityError
from django.utils import timezone

from core.models import JobListing, LocationTag, Run, Source


@pytest.mark.django_db
class TestSourceModel:
    def test_create_source(self):
        source = Source.objects.create(
            name="Airbnb", platform="greenhouse", board_id="airbnb"
        )
        assert source.name == "Airbnb"
        assert source.platform == "greenhouse"
        assert source.board_id == "airbnb"
        assert source.is_active is True
        assert source.created_at is not None
        assert source.updated_at is not None

    def test_str_representation(self):
        source = Source(name="Airbnb", platform="greenhouse")
        assert str(source) == "Airbnb (greenhouse)"

    def test_platform_choices(self):
        source = Source(name="Test", platform="workday", board_id="test")
        with pytest.raises(Exception):
            source.full_clean()

    def test_unique_constraint_platform_board_id(self):
        Source.objects.create(
            name="Airbnb", platform="greenhouse", board_id="airbnb"
        )
        with pytest.raises(IntegrityError):
            Source.objects.create(
                name="Airbnb Copy", platform="greenhouse", board_id="airbnb"
            )


@pytest.mark.django_db
class TestLocationTagModel:
    def test_create_tag(self):
        tag = LocationTag.objects.create(name="Toronto")
        assert tag.name == "Toronto"

    def test_str_representation(self):
        tag = LocationTag(name="Toronto")
        assert str(tag) == "Toronto"

    def test_unique_name(self):
        LocationTag.objects.create(name="Toronto")
        with pytest.raises(IntegrityError):
            LocationTag.objects.create(name="Toronto")


@pytest.mark.django_db
class TestJobListingModel:
    def test_create_listing(self):
        source = Source.objects.create(
            name="Airbnb", platform="greenhouse", board_id="airbnb"
        )
        listing = JobListing.objects.create(
            source=source,
            external_id="12345",
            title="Software Engineer",
            url="https://example.com/jobs/12345",
        )
        assert listing.status == "active"
        assert listing.department is None
        assert listing.locations.count() == 0
        assert listing.first_seen_at is not None
        assert listing.last_seen_at is not None

    def test_str_representation(self):
        source = Source(name="Airbnb", platform="greenhouse")
        listing = JobListing(source=source, title="Software Engineer")
        assert str(listing) == "Software Engineer at Airbnb"

    def test_unique_constraint_source_external_id(self):
        source = Source.objects.create(
            name="Airbnb", platform="greenhouse", board_id="airbnb"
        )
        JobListing.objects.create(
            source=source,
            external_id="12345",
            title="Software Engineer",
            url="https://example.com/jobs/12345",
        )
        with pytest.raises(IntegrityError):
            JobListing.objects.create(
                source=source,
                external_id="12345",
                title="Duplicate",
                url="https://example.com/jobs/12345",
            )

    def test_status_defaults_to_active(self):
        source = Source.objects.create(
            name="Airbnb", platform="greenhouse", board_id="airbnb"
        )
        listing = JobListing.objects.create(
            source=source,
            external_id="12345",
            title="Software Engineer",
            url="https://example.com/jobs/12345",
        )
        assert listing.status == "active"

    def test_enriched_fields(self):
        source = Source.objects.create(
            name="Spotify", platform="lever", board_id="spotify"
        )
        listing = JobListing.objects.create(
            source=source,
            external_id="abc",
            title="Engineer",
            url="https://example.com/abc",
            team="Platform",
            employment_type="full_time",
            workplace_type="remote",
            country="CA",
            published_at=timezone.now(),
            updated_at_source=timezone.now(),
        )
        assert listing.team == "Platform"
        assert listing.employment_type == "full_time"
        assert listing.workplace_type == "remote"
        assert listing.country == "CA"
        assert listing.published_at is not None
        assert listing.updated_at_source is not None

    def test_expired_at_set_on_expiration(self):
        source = Source.objects.create(
            name="Airbnb", platform="greenhouse", board_id="airbnb"
        )
        listing = JobListing.objects.create(
            source=source,
            external_id="exp1",
            title="Engineer",
            url="https://example.com/exp1",
        )
        assert listing.expired_at is None
        now = timezone.now()
        listing.status = "expired"
        listing.expired_at = now
        listing.save()
        listing.refresh_from_db()
        assert listing.status == "expired"
        assert listing.expired_at == now

    def test_multiple_locations(self):
        source = Source.objects.create(
            name="Cohere", platform="ashby", board_id="cohere"
        )
        listing = JobListing.objects.create(
            source=source,
            external_id="xyz",
            title="MLE",
            url="https://example.com/xyz",
        )
        t1 = LocationTag.objects.create(name="Toronto")
        t2 = LocationTag.objects.create(name="New York")
        listing.locations.add(t1, t2)
        assert listing.locations.count() == 2

    def test_shared_location_tag(self):
        tag = LocationTag.objects.create(name="Toronto")
        s1 = Source.objects.create(name="A", platform="lever", board_id="a")
        s2 = Source.objects.create(name="B", platform="ashby", board_id="b")
        l1 = JobListing.objects.create(
            source=s1, external_id="1", title="J1", url="https://example.com/1"
        )
        l2 = JobListing.objects.create(
            source=s2, external_id="2", title="J2", url="https://example.com/2"
        )
        l1.locations.add(tag)
        l2.locations.add(tag)
        assert tag.joblisting_set.count() == 2

    def test_enriched_fields_nullable(self):
        source = Source.objects.create(
            name="Airbnb", platform="greenhouse", board_id="airbnb"
        )
        listing = JobListing.objects.create(
            source=source,
            external_id="123",
            title="Engineer",
            url="https://example.com/123",
        )
        assert listing.team is None
        assert listing.employment_type is None
        assert listing.workplace_type is None
        assert listing.country is None
        assert listing.published_at is None
        assert listing.updated_at_source is None
        assert listing.expired_at is None


@pytest.mark.django_db
class TestRunModel:
    def test_create_run_defaults(self):
        run = Run.objects.create()
        assert run.status == "pending"
        assert run.started_at is None
        assert run.finished_at is None
        assert run.sources_processed == 0
        assert run.listings_created == 0
        assert run.listings_updated == 0
        assert run.listings_expired == 0
        assert run.error_message is None
        assert run.created_at is not None

    def test_str_representation(self):
        run = Run(id=5, status="completed")
        assert str(run) == "Run #5 (completed)"

    def test_status_transition_to_completed(self):
        run = Run.objects.create()
        run.status = "completed"
        run.started_at = timezone.now()
        run.finished_at = timezone.now()
        run.sources_processed = 2
        run.listings_created = 10
        run.save()
        run.refresh_from_db()
        assert run.status == "completed"
        assert run.sources_processed == 2
        assert run.listings_created == 10
