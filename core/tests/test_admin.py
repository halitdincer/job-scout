import pytest
from django.contrib.admin.sites import site

from core.admin import JobListingAdmin, LocationTagAdmin, RunAdmin, SourceAdmin
from core.models import JobListing, LocationTag, Run, Source


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
        assert LocationTagAdmin.list_display == ("name",)

    def test_search_fields(self):
        assert LocationTagAdmin.search_fields == ("name",)


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
