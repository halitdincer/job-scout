import pytest
from django.contrib.admin.sites import site

from core.admin import JobListingAdmin, LocationTagAdmin, RunAdmin, SavedViewAdmin, SeenListingAdmin, SourceAdmin
from core.models import JobListing, LocationTag, Run, SavedView, SeenListing, Source


class TestSourceAdmin:
    def test_registered(self):
        assert site.is_registered(Source)

    def test_list_display(self):
        assert SourceAdmin.list_display == ("name", "platform", "board_id", "is_active")

    def test_search_fields(self):
        assert SourceAdmin.search_fields == ("name", "board_id")

    def test_list_filter(self):
        assert SourceAdmin.list_filter == ("platform", "is_active")


class TestJobListingAdmin:
    def test_registered(self):
        assert site.is_registered(JobListing)

    def test_list_display(self):
        assert JobListingAdmin.list_display == (
            "title",
            "source",
            "department",
            "status",
            "employment_type",
            "workplace_type",
            "expired_at",
            "first_seen_at",
        )

    def test_search_fields(self):
        assert JobListingAdmin.search_fields == ("title", "department")

    def test_list_filter(self):
        assert JobListingAdmin.list_filter == ("status", "source", "employment_type", "workplace_type")


class TestLocationTagAdmin:
    def test_registered(self):
        assert site.is_registered(LocationTag)

    def test_list_display(self):
        assert LocationTagAdmin.list_display == ("name", "country_code", "region_code", "city")

    def test_list_editable(self):
        assert LocationTagAdmin.list_editable == ("country_code", "region_code", "city")

    def test_search_fields(self):
        assert LocationTagAdmin.search_fields == ("name",)

    def test_list_filter(self):
        assert LocationTagAdmin.list_filter == ("country_code",)


class TestRunAdmin:
    def test_registered(self):
        assert site.is_registered(Run)

    def test_list_display(self):
        assert RunAdmin.list_display == (
            "id",
            "status",
            "started_at",
            "finished_at",
            "sources_processed",
            "listings_created",
            "listings_expired",
        )

    def test_list_filter(self):
        assert RunAdmin.list_filter == ("status",)


class TestSeenListingAdmin:
    def test_registered(self):
        assert site.is_registered(SeenListing)

    def test_list_display(self):
        assert SeenListingAdmin.list_display == ("user", "listing", "created_at")

    def test_search_fields(self):
        assert SeenListingAdmin.search_fields == (
            "user__username",
            "listing__title",
            "listing__external_id",
        )


class TestSavedViewAdmin:
    def test_registered(self):
        assert site.is_registered(SavedView)

    def test_list_display(self):
        assert SavedViewAdmin.list_display == ("name", "user", "created_at", "updated_at")

    def test_search_fields(self):
        assert SavedViewAdmin.search_fields == ("name", "user__username")

    def test_list_filter(self):
        assert SavedViewAdmin.list_filter == ("user",)
