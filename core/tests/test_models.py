import pytest
from django.db import IntegrityError
from django.utils import timezone

from django.contrib.auth import get_user_model

from core.models import JobListing, LocationTag, Run, SavedView, SeenListing, Source


@pytest.mark.django_db
class TestSourceModel:
    def test_create_source(self):
        source = Source.objects.create(
            name="Airbnb", platform="greenhouse", board_id="airbnb-model"
        )
        assert source.name == "Airbnb"
        assert source.platform == "greenhouse"
        assert source.board_id == "airbnb-model"
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
            name="Airbnb", platform="greenhouse", board_id="airbnb-model"
        )
        with pytest.raises(IntegrityError):
            Source.objects.create(
                name="Airbnb Copy", platform="greenhouse", board_id="airbnb-model"
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

    def test_geo_fields_default_null(self):
        tag = LocationTag.objects.create(name="Some Office")
        assert tag.country_code is None
        assert tag.region_code is None
        assert tag.city is None

    def test_geo_fields_full_mapping(self):
        tag = LocationTag.objects.create(
            name="Toronto, ON",
            country_code="CA",
            region_code="CA-ON",
            city="Toronto",
        )
        assert tag.country_code == "CA"
        assert tag.region_code == "CA-ON"
        assert tag.city == "Toronto"

    def test_geo_fields_partial_mapping(self):
        tag = LocationTag.objects.create(
            name="Canada", country_code="CA"
        )
        assert tag.country_code == "CA"
        assert tag.region_code is None
        assert tag.city is None

    def test_geo_key_full(self):
        tag = LocationTag(
            name="Toronto, ON",
            country_code="CA",
            region_code="CA-ON",
            city="Toronto",
        )
        assert tag.geo_key == "CA-ON-Toronto"

    def test_geo_key_country_and_region(self):
        tag = LocationTag(
            name="Ontario", country_code="CA", region_code="CA-ON"
        )
        assert tag.geo_key == "CA-ON"

    def test_geo_key_country_only(self):
        tag = LocationTag(name="Canada", country_code="US")
        assert tag.geo_key == "US"

    def test_geo_key_none_when_unmapped(self):
        tag = LocationTag(name="Unknown Place")
        assert tag.geo_key is None


@pytest.mark.django_db
class TestJobListingModel:
    def test_create_listing(self):
        source = Source.objects.create(
            name="Airbnb", platform="greenhouse", board_id="airbnb-model"
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
            name="Airbnb", platform="greenhouse", board_id="airbnb-model"
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
            name="Airbnb", platform="greenhouse", board_id="airbnb-model"
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
            published_at=timezone.now(),
            updated_at_source=timezone.now(),
        )
        assert listing.team == "Platform"
        assert listing.employment_type == "full_time"
        assert listing.workplace_type == "remote"
        assert listing.published_at is not None
        assert listing.updated_at_source is not None

    def test_expired_at_set_on_expiration(self):
        source = Source.objects.create(
            name="Airbnb", platform="greenhouse", board_id="airbnb-model"
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
            name="Airbnb", platform="greenhouse", board_id="airbnb-model"
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


@pytest.mark.django_db
class TestSeenListingModel:
    def test_create_seen_listing(self):
        user = get_user_model().objects.create_user(
            username="seen-model-user",
            password="safe-test-password-123",
        )
        source = Source.objects.create(
            name="Seen Co", platform="greenhouse", board_id="seenco"
        )
        listing = JobListing.objects.create(
            source=source,
            external_id="seen-1",
            title="Seen Listing",
            url="https://example.com/seen-1",
        )

        seen_listing = SeenListing.objects.create(user=user, listing=listing)

        assert seen_listing.user == user
        assert seen_listing.listing == listing
        assert seen_listing.created_at is not None

    def test_unique_constraint_per_user_and_listing(self):
        user = get_user_model().objects.create_user(
            username="seen-unique-user",
            password="safe-test-password-123",
        )
        source = Source.objects.create(
            name="Unique Seen Co", platform="lever", board_id="uniqueseen"
        )
        listing = JobListing.objects.create(
            source=source,
            external_id="seen-2",
            title="Unique Seen Listing",
            url="https://example.com/seen-2",
        )

        SeenListing.objects.create(user=user, listing=listing)

        with pytest.raises(IntegrityError):
            SeenListing.objects.create(user=user, listing=listing)

    def test_str_representation(self):
        user = get_user_model().objects.create_user(
            username="seen-str-user",
            password="safe-test-password-123",
        )
        source = Source.objects.create(
            name="Seen String Co", platform="ashby", board_id="seen-string"
        )
        listing = JobListing.objects.create(
            source=source,
            external_id="seen-3",
            title="Seen Str Listing",
            url="https://example.com/seen-3",
        )
        seen_listing = SeenListing.objects.create(user=user, listing=listing)

        assert str(seen_listing) == f"{user.id}:{listing.id}"


@pytest.mark.django_db
class TestSavedViewModel:
    def _create_user(self, username="view-user"):
        return get_user_model().objects.create_user(
            username=username, password="safe-test-password-123"
        )

    def test_create_saved_view(self):
        user = self._create_user()
        view = SavedView.objects.create(
            user=user,
            name="US Remote",
            filter_expression={"field": "country", "operator": "eq", "value": "US"},
            columns=[{"field": "title", "visible": True}],
            sort=[{"column": "first_seen_at", "dir": "desc"}],
        )
        assert view.name == "US Remote"
        assert view.filter_expression == {"field": "country", "operator": "eq", "value": "US"}
        assert view.columns == [{"field": "title", "visible": True}]
        assert view.sort == [{"column": "first_seen_at", "dir": "desc"}]
        assert view.config == {}
        assert view.created_at is not None
        assert view.updated_at is not None

    def test_str_representation(self):
        user = self._create_user("view-str-user")
        view = SavedView(name="My View", user=user)
        assert str(view) == "My View (view-str-user)"

    def test_unique_constraint_user_name(self):
        user = self._create_user("view-unique-user")
        SavedView.objects.create(
            user=user, name="Dupe", columns=[], sort=[]
        )
        with pytest.raises(IntegrityError):
            SavedView.objects.create(
                user=user, name="Dupe", columns=[], sort=[]
            )

    def test_different_users_same_name_allowed(self):
        u1 = self._create_user("view-user-a")
        u2 = self._create_user("view-user-b")
        SavedView.objects.create(user=u1, name="Same", columns=[], sort=[])
        SavedView.objects.create(user=u2, name="Same", columns=[], sort=[])
        assert SavedView.objects.filter(name="Same").count() == 2

    def test_filter_expression_nullable(self):
        user = self._create_user("view-null-filter")
        view = SavedView.objects.create(
            user=user, name="No Filter", columns=[], sort=[]
        )
        assert view.filter_expression is None

    def test_config_defaults_to_empty_dict(self):
        user = self._create_user("view-config-user")
        view = SavedView.objects.create(
            user=user, name="Config Test", columns=[], sort=[]
        )
        assert view.config == {}

    def test_cascade_delete_user(self):
        user = self._create_user("view-cascade-user")
        SavedView.objects.create(user=user, name="Gone", columns=[], sort=[])
        user.delete()
        assert SavedView.objects.filter(name="Gone").count() == 0
