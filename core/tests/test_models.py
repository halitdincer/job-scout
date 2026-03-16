import pytest
from django.db import IntegrityError

from core.models import JobListing, Run, Source


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
        assert listing.location is None
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
        from django.utils import timezone

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
